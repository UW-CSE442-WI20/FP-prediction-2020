// JavaScript Document
var d3 = require('d3')
var topo = require('topojson');
/**
 * scroller - handles the details of figuring out which section the user is currently scrolled to.
 */
function scroller() {
  var container = d3.select('body');
  var dispatch = d3.dispatch('active', 'progress'); // event dispatcher
  // d3 selection of all the text sections that will be scrolled through
  var sections = null;
  // array that will hold the y coordinate of each section that is scrolled through
  var sectionPositions = [];
  var currentIndex = -1;
  // y coordinate of
  var containerStart = 0;
  /**
   * scroll - constructor function. Sets up scroller to monitor scrolling of els selection.
   *
   * @param els - d3 selection of elements that will be scrolled through by user.
   */
  function scroll(els) {
    sections = els;
    // when window is scrolled call position. When it is resized call resize.
    d3.select(window)
      .on('scroll.scroller', position)
      .on('resize.scroller', resize);
    // manually call resize initially to setup scroller.
    resize();
    // hack to get position to be called once for the scroll position on load.
    // @v4 timer no longer stops if you return true at the end of the callback function - so here we stop it
	// explicitly.
    var timer = d3.timer(function () {
      position();
      timer.stop();
    });
  }
  /**
   * resize - called initially and also when page is resized. Resets the sectionPositions
   */
  function resize() {
    // sectionPositions will be each sections starting position relative to the top of the first section.
    sectionPositions = [];
    var startPos;
    sections.each(function (d, i) {
      var top = this.getBoundingClientRect().top;
      if (i === 0) {
        startPos = top;
      }
      sectionPositions.push(top - startPos);
    });
    containerStart = container.node().getBoundingClientRect().top + window.pageYOffset;
  }
  /**
   * position - get current users position. if user has scrolled to new section, dispatch active event with 
   * new section index.
   */
  function position() {
    var pos = window.pageYOffset - 10 - containerStart;
    var sectionIndex = d3.bisect(sectionPositions, pos);
    sectionIndex = Math.min(sections.size() - 1, sectionIndex);
    if (currentIndex !== sectionIndex) {
      dispatch.call('active', this, sectionIndex);
      currentIndex = sectionIndex;
    }
    var prevIndex = Math.max(sectionIndex - 1, 0);
    var prevTop = sectionPositions[prevIndex];
    var progress = (pos - prevTop) / (sectionPositions[sectionIndex] - prevTop);
    dispatch.call('progress', this, currentIndex, progress);
  }
  /**
   * container - get/set the parent element of the sections. Useful for if the scrolling doesn't start at the 
   * very top of the page.
   * @param value - the new container value
   */
  scroll.container = function (value) {
    if (arguments.length === 0) {
      return container;
    }
    container = value;
    return scroll;
  };
  // @v4 There is now no d3.rebind, so this implements a .on method to pass in a callback to the dispatcher.
  scroll.on = function (action, callback) {
    dispatch.on(action, callback);
  };
  return scroll;
}

/**
 * scrollVis - encapsulates all the code for the visualization using reusable charts pattern:
 * http://bost.ocks.org/mike/chart/
 */
var scrollVis = function () {
  // constants to define the size and margins of the vis area.
  var width = 600;
  var height = 520;
  var margin = { top: 0, left: 20, bottom: 40, right: 10 };
  // Keep track of which visualization we are on and which was the last index activated. When user scrolls
  // quickly, we want to call all the activate functions that they pass.
  var lastIndex = -1;
  var activeIndex = 0;
  // main svg used for visualization
  var svg = null;
  // d3 selection that will be used for displaying visualizations
  var g = null;
  // When scrolling to a new section the activation function for that section is called.
  var activateFunctions = [];
  // file paths to data files
  var county_csv = './data/FP_county_winners.csv';
  var state_csv = './FP_state_winners.csv';
  // dictionaries to store state and county info
  var stateInfo = {};
  var stateWinners = {};
  var countyInfo = {};
  var countyWinners = {};
  var years = [2000,2004,2008,2012,2016];
  /**
   * chart
   *
   * @param selection - the current d3 selection(s) to draw the visualization in. 
   */
  var chart = function (selection) {
    selection.each(function () {
	  var projection = d3.geoAlbersUsa().scale(1100).translate([width / 2, height / 2]);
      var path = d3.geoPath().projection(projection);
      // create svg
	  svg = d3.select(this).selectAll('svg');
//      svg = d3.select(this).selectAll('svg').data([wordData]);
      var svgE = svg.enter().append('svg');
      // @v4 use merge to combine enter and existing selection
      svg = svg.merge(svgE);
	  // give svg a width and height
      svg.attr('width', width + margin.left + margin.right);
      svg.attr('height', height + margin.top + margin.bottom);
      svg.append('g');
	  // this group element will be used to contain all other elements.
      g = svg.select('g')
             .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	  getStateInfo();
      getStateWinners();
      getCountyInfo();
      getCountyWinners();
//	  var stateInfo = getStateInfo();
//      var stateWinners = getStateWinners();
//      var countyInfo = getCountyInfo();
//      var countyWinners = getCountyWinners();
//	  var years = [2000,2004,2008,2012,2016];
//	  stateInfo = getStateInfo();
//	  stateWinners = getStateWinners();
//	  countyInfo = getCountyInfo();
//	  countyWinners = getCountyWinners();
	  setupVis(stateInfo, stateWinners, countyInfo, countyWinners, years);
      setupSections();
    });
  };
  
  /**
   * setupVis - creates initial elements for all sections of the visualization.
   *
   * @param stateInfo - 
   * @param stateWinners - 
   * @param countyInfo - 
   * @param countyWinners - 
   * @param years - 
   */
  var setupVis = function (stateInfo, stateWinners, countyInfo, countyWinners, years) {
	d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json", /*).then(*/function(json) {
      var states = topo.feature(json, json.objects.states);
	  for (var i = 0; i < years.length; i++) {
		console.log(years[i]);
		var class_name = years[i].toString() + "map"
		var winner = state_Winners[years[i]];
		var state_map = g.selectAll('path').data(states.features);
		var state_mapE = state_map.enter()
		  .append('path')
		  .classed(class_name, true);
		state_map = state_map.merge(state_mapE)
		  .attr("id", function (d) { 
            return  "c" + d.id;})
          .attr("class",function (d) {
            var temp = winner.find(x => x.id === d.id);
            if (temp) {
              var ret = "states";
              ret +=  " " + temp.winner_name;
              return ret;
            };
          })
          .attr('d', path)
//          .on("click", zoomToState)
          .append('title')
          .text(function (d) {
            var arr = stateInfo[year][d.id];
            if (arr) {
              return stateInfo[year][d.id][0] + "\n" + 
                stateInfo[year][d.id][1] + "\n" + 
                stateInfo[year][d.id][2] + "%";
            }  
          })
		  .attr('opacity', 0);	
	  }
	});
  }

  /**
   * setupSections - each section is activated by a separate function. Here we associate these functions to 
   * the sections based on the section's index.
   */
  var setupSections = function () {
    // activateFunctions are called each time the active section changes
    activateFunctions[0] = result_2000;
    activateFunctions[1] = result_2004;
    activateFunctions[2] = result_2008;
    activateFunctions[3] = result_2012;
    activateFunctions[4] = result_2016;
    activateFunctions[5] = swing_2016;
    activateFunctions[6] = florida;
    activateFunctions[7] = iowa;
    activateFunctions[8] = michigan;
	activateFunctions[9] = ohio;
    activateFunctions[10] = pennsylvania;
    activateFunctions[11] = wisconsin;
    activateFunctions[12] = prediction_2020;
  };
	
  /**
   * ACTIVATE FUNCTIONS
   *
   * These will be called when their section is scrolled to.
   */
  function result_2000() {
	g.selectAll('.2004map')
      .transition()
      .duration(0)
      .attr('opacity', 0);

    g.selectAll('.2000map')
      .transition()
      .duration(500)
      .attr('opacity', 1.0)
  }
  function result_2004() {
	g.selectAll('.2000map')
      .transition()
      .duration(0)
      .attr('opacity', 0);

    g.selectAll('.2004map')
      .transition()
      .duration(500)
      .attr('opacity', 1.0)
	  
	g.selectAll('.2008map')
      .transition()
      .duration(0)
      .attr('opacity', 0);
  }
  function result_2008() {
	g.selectAll('.2004map')
      .transition()
      .duration(0)
      .attr('opacity', 0);

    g.selectAll('.2008map')
      .transition()
      .duration(500)
      .attr('opacity', 1.0)
	  
	g.selectAll('.2012map')
      .transition()
      .duration(0)
      .attr('opacity', 0);
  }
  function result_2012() {
	g.selectAll('.2008map')
      .transition()
      .duration(0)
      .attr('opacity', 0);

    g.selectAll('.2012map')
      .transition()
      .duration(500)
      .attr('opacity', 1.0)
	  
	g.selectAll('.2016map')
      .transition()
      .duration(0)
      .attr('opacity', 0);
  }
  function result_2016() {
	g.selectAll('.2012map')
      .transition()
      .duration(0)
      .attr('opacity', 0);

    g.selectAll('.2016map')
      .transition()
      .duration(500)
      .attr('opacity', 1.0)
	  
//	g.selectAll('.2008map')
//      .transition()
//      .duration(0)
//      .attr('opacity', 0);
  }
  function swing_2016() {}
  function florida() {}
  function iowa() {}
  function michigan() {}
  function ohio() {}
  function pennsylvania() {}
  function wisconsin() {}
  function prediction_2020() {}
	
  /**
   * DATA FUNCTIONS
   *
   * Used to coerce the data into the formats we need to visualize
   */
  function getStateInfo() {
    d3.csv(state_csv, /*).then(*/function(data) {
	  for (var j = 0; j < years.length; j++) {
		var year = years[j];
        stateInfo[year] = {};
        for (var i = 0; i < data.length; i++) {
          var temp_id = Math.trunc(data[i].FIPS).toString(); 
          if (temp_id.length == 1) {
            temp_id = "0".concat(temp_id);
          }
		  var yper = year.toString() + "_percent"
		  var ycan = year.toString() + "_cand"
          var percent = (parseFloat(data[i][yper]) * 100).toPrecision(3);
	   	  stateInfo[year][temp_id] = [data[i]["state_po"],data[i][ycan],percent];
        }	
	  }
	})
  }
  function getStateWinners() {
    d3.csv(state_csv, /*).then(*/function(data) {
	  for (var j = 0; j < years.length; j++) { 
	    var year = years[j];
	    var winner = [];
        for (var i = 0; i < data.length; i++) {
          var temp_id = Math.trunc(data[i].FIPS).toString(); 
          if (temp_id.length == 1) {
            temp_id = "0".concat(temp_id);
          }
		  var ypar = "party" + year.toString();
		  var yswi = "Switch_" + (year - 4).toString() + "_" + year.toString();
          winner.push({id:temp_id,winner_name:data[i][ypar] + " " + data[i][yswi]}); 
        } 
	    stateWinners[year] = winner;
	  }
    })
  }
  function getCountyInfo() {}
  function getCountyWinners() {}
	
  /**
   * activate
   *
   * @param index - index of the activated section
   */
  chart.activate = function (index) {
    activeIndex = index;
    var sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
    var scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
    scrolledSections.forEach(function (i) {
      activateFunctions[i]();
    });
    lastIndex = activeIndex;
  };
	
  // return chart function
  return chart;
};

function display() {
  // create a new plot and display it
  var plot = scrollVis();
  d3.select('#vis')
    .call(plot);
  // setup scroll functionality
  var scroll = scroller().container(d3.select('#graphic'));
  // pass in .step selection as the steps
  scroll(d3.selectAll('.step'));
  // setup event handling
  scroll.on('active', function (index) {
    // highlight current step text
    d3.selectAll('.step')
      .style('opacity', function (d, i) { return i === index ? 1 : 0.1; });
    // activate current section
    plot.activate(index);
  });
}

display();