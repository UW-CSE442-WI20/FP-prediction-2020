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
  var width = 900;
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
  // 
//  var projection = d3.geoAlbersUsa().scale(1100).translate([width / 2, height / 2]);
//  var path = d3.geoPath().projection(projection);
  // file paths to data files
  var county_csv = require('./data/FP_county_winners.csv');
  var state_csv = require('./FP_state_winners.csv');
  // dictionaries to store state and county info
  var stateInfo = {};
//  var stateWinners = {};
  var stateWinners = [];
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
      // create svg
	  svg = d3.select(this).append('svg');
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
	// title
    g.append('text')
      .attr('class', 'title')
      .attr('x', width / 3)
      .attr('y', height / 3)
      .text('Prediction 2020')
	  .attr('opacity', 0);
	  
	var projection = d3.geoAlbersUsa().scale(900).translate([width / 2, height / 2]);
    var path = d3.geoPath().projection(projection);
	d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json").then(function(json) {
      var states = topo.feature(json, json.objects.states);
	  var state_map = g.selectAll('path').data(states.features);
	  var state_mapE = state_map.enter()
	    .append('path')
	    .classed('map', true);
	  state_map = state_map.merge(state_mapE)
	    .attr("id", function (d) { 
          return  "c" + d.id;})
        .attr("class",function (d) {
 		  var state = d.properties.name.replace(/\s/g,'');
          var temp = stateWinners.find((x) => x.id === d.id);
          if (temp) {
            var ret = "map states" + state;
			for (var i = 0; i <= 4; i++) {
              ret +=  " " + temp.winner_name[i];
            }
//            ret +=  " " + temp.winner_name;
			console.log(ret);
            return ret;
          };
        })
        .attr('d', path)
		.attr('stroke', 'black')
        .attr('opacity', 0)
//        .on("click", zoomToState)
        .append('title')
		.text(function(d) { return "" });
//        .text(function (d) {
//	      var temp = stateInfo["2000"];
//          var arr = temp[d.id];
//          if (arr) {
//            return temp[d.id][0] + "\n" + 
//              temp[d.id][1] + "\n" + 
//              temp[d.id][2] + "%";
//          }  
//        });	
	}); 
	  
	g.append('svg:image')
	  .attr('xlink:href','./Florida.png')
	  .attr('class', 'florida')
      .attr('height', '300')
      .attr('width', '300')
	  .attr('x', width / 3)
	  .attr('y', height / 3)
	  .attr('opacity', 0);
	  
	g.append('svg:image')
	  .attr('xlink:href','./Iowa.png')
	  .attr('class', 'iowa')
      .attr('height', '300')
      .attr('width', '300')
	  .attr('x', width / 3)
	  .attr('y', height / 3)
	  .attr('opacity', 0);
	  
	g.append('svg:image')
	  .attr('xlink:href','./Michigan.png')
	  .attr('class', 'michigan')
      .attr('height', '300')
      .attr('width', '300')
	  .attr('x', width / 3)
	  .attr('y', height / 3)
	  .attr('opacity', 0);
	  
	g.append('svg:image')
	  .attr('xlink:href','./Ohio.png')
	  .attr('class', 'ohio')
      .attr('height', '300')
      .attr('width', '300')
	  .attr('x', width / 3)
	  .attr('y', height / 3)
	  .attr('opacity', 0);
	  
	g.append('svg:image')
	  .attr('xlink:href','./Pennsylvania.png')
	  .attr('class', 'pennsylvania')
      .attr('height', '300')
      .attr('width', '300')
	  .attr('x', width / 3)
	  .attr('y', height / 3)
	  .attr('opacity', 0);
	  
	g.append('svg:image')
	  .attr('xlink:href','./Wisconsin.png')
	  .attr('class', 'wisconsin')
      .attr('height', '300')
      .attr('width', '300')
	  .attr('x', width / 3)
	  .attr('y', height / 3)
	  .attr('opacity', 0);
  }

  /**
   * setupSections - each section is activated by a separate function. Here we associate these functions to 
   * the sections based on the section's index.
   */
  var setupSections = function () {
    // activateFunctions are called each time the active section changes
    activateFunctions[0] = show_title;
	activateFunctions[1] = result_2000;
    activateFunctions[2] = result_2004;
    activateFunctions[3] = result_2008;
    activateFunctions[4] = result_2012;
    activateFunctions[5] = result_2016;
    activateFunctions[6] = swing_2016;
    activateFunctions[7] = florida;
    activateFunctions[8] = iowa;
    activateFunctions[9] = michigan;
	activateFunctions[10] = ohio;
    activateFunctions[11] = pennsylvania;
    activateFunctions[12] = wisconsin;
    activateFunctions[13] = prediction_2020;
  };
	
  /**
   * ACTIVATE FUNCTIONS
   *
   * These will be called when their section is scrolled to.
   */
  function show_title() {
	console.log('showTitle');
	g.selectAll(".map").select('title').text(function(d) { return "" });
	g.selectAll(".map").transition().duration(500).attr('opacity', 0);
	  
	g.selectAll('.title')
      .transition()
      .duration(500)
      .attr('opacity', 1.0);
  }
  function result_2000() {
	console.log('result2000')
	g.selectAll('.title')
      .transition()
      .duration(500)
      .attr('opacity', 0);
	g.selectAll(".map").transition().duration(500).attr('opacity', 1.0)
	g.selectAll(".republican2000TRUE").transition('color').duration(500).style("fill", "red");
	g.selectAll(".republican2000FALSE").transition('color').duration(500).style("fill", "lightcoral");
	g.selectAll(".democrat2000TRUE").transition('color').duration(500).style("fill", "blue");
	g.selectAll(".democrat2000FALSE").transition('color').duration(500).style("fill", "steelblue");
	g.selectAll(".map").select('title')
         .text(function (d) {
           let arr = stateInfo["2000"][d.id];
           if (arr) {
            return stateInfo["2000"][d.id][0] + "\n" + 
				stateInfo["2000"][d.id][1] + "\n" + 
				stateInfo["2000"][d.id][2] + "%";
           }  
         });
  }
  function result_2004() {
	console.log('result2004')
	g.selectAll(".map").transition().duration(0).attr('opacity', 1.0);
	g.selectAll(".republican2004TRUE").transition('color').duration(500).style("fill", "red");
	g.selectAll(".republican2004FALSE").transition('color').duration(500).style("fill", "lightcoral");
	g.selectAll(".democrat2004TRUE").transition('color').duration(500).style("fill", "blue");
	g.selectAll(".democrat2004FALSE").transition('color').duration(500).style("fill", "steelblue");
	g.selectAll(".map").select('title')
         .text(function (d) {
           let arr = stateInfo["2004"][d.id];
           if (arr) {
            return stateInfo["2004"][d.id][0] + "\n" + 
				stateInfo["2004"][d.id][1] + "\n" + 
				stateInfo["2004"][d.id][2] + "%";
           }  
         });
  }
  function result_2008() {
	console.log('result2008')
	g.selectAll(".map").transition().duration(0).attr('opacity', 1.0);
	g.selectAll(".republican2008TRUE").transition('color').duration(500).style("fill", "red");
	g.selectAll(".republican2008FALSE").transition('color').duration(500).style("fill", "lightcoral");
	g.selectAll(".democrat2008TRUE").transition('color').duration(500).style("fill", "blue");
	g.selectAll(".democrat2008FALSE").transition('color').duration(500).style("fill", "steelblue");
	g.selectAll(".map").select('title')
         .text(function (d) {
           let arr = stateInfo["2008"][d.id];
           if (arr) {
            return stateInfo["2008"][d.id][0] + "\n" + 
				stateInfo["2008"][d.id][1] + "\n" + 
				stateInfo["2008"][d.id][2] + "%";
           }  
         });
  }
  function result_2012() {
	console.log('result2012')
	g.selectAll(".map").transition().duration(0).attr('opacity', 1.0);
	g.selectAll(".republican2012TRUE").transition('color').duration(500).style("fill", "red");
	g.selectAll(".republican2012FALSE").transition('color').duration(500).style("fill", "lightcoral");
	g.selectAll(".democrat2012TRUE").transition('color').duration(500).style("fill", "blue");
	g.selectAll(".democrat2012FALSE").transition('color').duration(500).style("fill", "steelblue");
	g.selectAll(".map").select('title')
         .text(function (d) {
           let arr = stateInfo["2012"][d.id];
           if (arr) {
            return stateInfo["2012"][d.id][0] + "\n" + 
				stateInfo["2012"][d.id][1] + "\n" + 
				stateInfo["2012"][d.id][2] + "%";
           }  
         });  
  }
  function result_2016() {
	console.log('result2016')
	g.selectAll(".map").transition().duration(0).attr('opacity', 1.0);
	g.selectAll(".republican2016TRUE").transition('color').duration(500).style("fill", "red");
	g.selectAll(".republican2016FALSE").transition('color').duration(500).style("fill", "lightcoral");
	g.selectAll(".democrat2016TRUE").transition('color').duration(500).style("fill", "blue");
	g.selectAll(".democrat2016FALSE").transition('color').duration(500).style("fill", "steelblue");
	g.selectAll(".map").select('title')
         .text(function (d) {
           let arr = stateInfo["2016"][d.id];
           if (arr) {
            return stateInfo["2016"][d.id][0] + "\n" + 
				stateInfo["2016"][d.id][1] + "\n" + 
				stateInfo["2016"][d.id][2] + "%";
           }  
         });
  }
  function swing_2016() {
	console.log('swing2016');
	g.selectAll(".map").transition().duration(500).attr('opacity', 1.0);
	g.selectAll(".republican2016TRUE").transition('color').duration(500).style("fill", "red");
	g.selectAll(".republican2016FALSE").transition('color').duration(500).style("fill", "black");
	g.selectAll(".democrat2016TRUE").transition('color').duration(500).style("fill", "blue");
	g.selectAll(".democrat2016FALSE").transition('color').duration(500).style("fill", "black");
	g.selectAll(".florida").transition().duration(500).attr('opacity', 0);
  }
  function florida() {
	console.log('florida');
	g.selectAll(".map").select('title').text(function(d) { return "" });
	g.selectAll(".map").transition().duration(500).attr('opacity', 0);
	g.selectAll(".florida").transition().duration(500).attr('opacity', 1.0);
	g.selectAll(".iowa").transition().duration(500).attr('opacity', 0);
  }
  function iowa() {
	console.log('iowa');
	g.selectAll(".florida").transition().duration(500).attr('opacity', 0);
	g.selectAll(".iowa").transition().duration(500).attr('opacity', 1.0);
	g.selectAll(".michigan").transition().duration(500).attr('opacity', 0);
  }
  function michigan() {
	console.log('michigan');
	g.selectAll(".iowa").transition().duration(500).attr('opacity', 0);
	g.selectAll(".michigan").transition().duration(500).attr('opacity', 1.0);
	g.selectAll(".ohio").transition().duration(500).attr('opacity', 0);
  }
  function ohio() {
	console.log('ohio');
	g.selectAll(".michigan").transition().duration(500).attr('opacity', 0);
	g.selectAll(".ohio").transition().duration(500).attr('opacity', 1.0);
	g.selectAll(".pennsylvania").transition().duration(500).attr('opacity', 0);
  }
  function pennsylvania() {
	console.log('pennsylvania');
	g.selectAll(".ohio").transition().duration(500).attr('opacity', 0);
	g.selectAll(".pennsylvania").transition().duration(500).attr('opacity', 1.0);
	g.selectAll(".wisconsin").transition().duration(500).attr('opacity', 0);
  }
  function wisconsin() {
	console.log('wisconsin');
	g.selectAll(".pennsylvania").transition().duration(500).attr('opacity', 0);
	g.selectAll(".wisconsin").transition().duration(500).attr('opacity', 1.0);
  }
  function prediction_2020() {
	console.log('prediction2020');
	g.selectAll(".wisconsin").transition().duration(500).attr('opacity', 0);
  }
	
  /**
   * DATA FUNCTIONS
   *
   * Used to coerce the data into the formats we need to visualize
   */
  function getStateInfo() {
    d3.csv(state_csv).then(function(data) {
	  for (var j = 0; j < years.length; j++) {
		console.log('info' + years[j].toString())
		var year = years[j].toString();
        stateInfo[year] = {};
        for (var i = 0; i < data.length; i++) {
          var temp_id = Math.trunc(data[i].FIPS).toString(); 
          if (temp_id.length == 1) {
            temp_id = "0".concat(temp_id);
          }
		  var yper = year + "_percent"
		  var ycan = year + "_cand"
          var percent = (parseFloat(data[i][yper]) * 100).toPrecision(3);
	   	  stateInfo[year][temp_id] = [data[i]["state_po"],data[i][ycan],percent];
        }	
	  }
	})
  }
  function getStateWinners() {
    d3.csv(state_csv).then(function(data) {
//	  for (var j = 0; j < years.length; j++) {
//	    var year = years[j].toString();
//		stateWinners[year] = [];  
        for (var i = 0; i < data.length; i++) {
          var temp_id = Math.trunc(data[i].FIPS).toString(); 
          if (temp_id.length == 1) {
            temp_id = "0".concat(temp_id);
          }
//		  var ypar = "party" + year;
//		  var yswi = "Switch_" + (years[j] - 4).toString() + "_" + year;
//		  stateWinners[year].push({id:temp_id,winner_name:data[i][ypar] + " " + data[i][yswi]}); 
		  stateWinners.push({id:temp_id,winner_name:[data[i]["party2000"] + "2000" + data[i]["Switch_1996_2000"],data[i]["party2004"] + "2004" + data[i]["Switch_2000_2004"],data[i]["party2008"] + "2008" + data[i]["Switch_2004_2008"],data[i]["party2012"] + "2012" + data[i]["Switch_2008_2012"],data[i]["party2016"] + "2016" + data[i]["Switch_2012_2016"]]});  

        } 
//	  }
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

/**
 * display - called once data has been loaded. sets up the scroller and displays the visualization.
 *
 * @param data - loaded tsv data
 */
function display() {
  // create a new plot and display it
  var plot = scrollVis();
//  console.log(plot);
  d3.select('#vis').call(plot);
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
//window.addEventListener("load",display);
//d3.csv('./FP_state_winners.csv', display);