// JavaScript Document

var d3 = require('d3')
var topo = require('topojson');

/**
 * scroller - handles the details of figuring out which section the user is currently scrolled to.
 */
function scroller() {
	var container = d3.select('body');
	var dispatch = d3.dispatch('active', 'progress');
	var sections = null;
	var sectionPositions = [];
	var currentIndex = -1;
	var containerStart = 0;
	
	/**
	 * scroll - constructor function. Sets up scroller to monitor scrolling of els selection.
	 *
	 * @param els - d3 selection of elements that will be scrolled through by user.
	 */
	function scroll(els) {
		sections = els;
		d3.select(window)
			.on('scroll.scroller', position)
			.on('resize.scroller', resize);
		resize();
		var timer = d3.timer(function () {
			position();
			timer.stop();
		});
	}
	
	/**
	 * resize - called initially and also when page is resized. Resets the sectionPositions
	 */
	function resize() {
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
	 * container - get/set the parent element of the sections. Useful for if the scrolling doesn't start at  
	 * the very top of the page.
	 * 
	 * @param value - the new container value
	 */
	scroll.container = function (value) {
		if (arguments.length === 0) {
			return container;
		}
		container = value;
		return scroll;
	};
	
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
	var margin = {
		top: 10,
		bottom: 10,
		left: 10,
		right:10
	}, width = 890
		, width = width - margin.left - margin.right
		, mapRatio = 0.5
		, height = width * mapRatio
		, active = d3.select(null);
	
	var lastIndex = -1;
	var activeIndex = 0;
	var svg = null;
	var g = null;
	var activateFunctions = [];
	
	var county_csv = require('./FP_county_winners.csv');
	var state_csv = require('./FP_state_winners.csv');
	var county_csv = require('./FP_county_winners.csv');
	var state_csv = require('./FP_state_winners.csv');
	
	var stateInfo = {};
	var countyInfo = {};
	var stateWinners = []; 
	var countyWinners = [];
	
	var years = [2000,2004,2008,2012,2016];
	
	var projection = d3.geoAlbersUsa()
	.translate([width /2 , height / 2])
	.scale(width);

	var path = d3.geoPath()
	.projection(projection);
	
	/**
	 * chart
	 *
	 * @param selection - the current d3 selection(s) to draw the visualization in.
	 */
	var chart = function (selection) {
		selection.each(function () {
			svg = d3.select(this).append('svg')
				.attr('class', 'center-container')
				.attr('height', height + margin.top + margin.bottom)
				.attr('width', width + margin.left + margin.right);
			
			svg.append('rect')
				.attr('class', 'background center-container')
				.attr('height', height + margin.top + margin.bottom)
				.attr('width', width + margin.left + margin.right)
				.on('click', clicked);
			
			g = svg.append("g")
				.attr('class', 'center-container center-items us-state')
				.attr('transform', 'translate('+margin.left+','+margin.top+')')
				.attr('width', width + margin.left + margin.right)
				.attr('height', height + margin.top + margin.bottom)
			
			getStateInfo();
			getStateWinners();
			getCountyInfo();
			getCountyWinners();
			
			setupVis();
			
			setupSections();
		});
	};
	
	/**
	 * setupVis - creates initial elements for all sections of the visualization.
	 */
	var setupVis = function () {
		// title
		g.append("text")
			.attr("class", "title")
			.attr("x", width / 3)
			.attr("y", height / 3)
			.text("Prediction 2020")
			.style("opacity", 0);
		
		d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json").then(function(json) {
			var counties = topo.feature(json, json.objects.counties);
			g.append("g")
				.attr("id", "counties")
				.selectAll("path")
				.data(counties.features)
				.enter().append("path")
				.attr("d", path)
				.attr("class",function (d) {
					var county = d.properties.name.replace(/\s/g,'');
					var temp = countyWinners.find((x) => x.id === d.id);
					if (temp) {
						var ret = "county-boundary counties " + county;
						for (var i = 0; i <= 4; i++) {
							ret +=  " " + temp.winner_name[i];
						}
						return ret;
					};
				})
				.style("opacity", 0)
				.on("click", reset)
				.append('title')
				.text(function(d) { return "" });

			var states = topo.feature(json, json.objects.states);
			g.append("g")
				.attr("id", "states")
				.selectAll("path")
				.data(states.features)
				.enter().append("path")
				.attr("d", path)
				.attr("class", function (d) {
					var state = d.properties.name.replace(/\s/g,'');
					var temp = stateWinners.find((x) => x.id === d.id);
					if (temp) {
						var ret = "state states " + state;
						for (var i = 0; i <= 4; i++) {
							ret +=  " " + temp.winner_name[i];
						}
						return ret;
					};
				})
				.style("opacity", 0)
				.on("click", clicked)
				.append('title')
				.text(function(d) { return "" });

			g.append("path")
				.datum(topojson.mesh(json, json.objects.states, function(a, b) { return a !== b; }))
				.attr("id", "state-borders")
				.attr("class", "state-borders")
				.attr("d", path)
				.style("opacity", 0);
		});
	};
	
	/**
	 * setupSections - each section is activated by a separate function. Here we associate these functions to 
	 * the sections based onthe section's index.
	 */
	var setupSections = function () {
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
		console.log("show_title"); 
		g.selectAll('.title')
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".states")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".state-borders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".counties")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".states")
			.select('title')
			.text(function(d) { return "" });
		g.selectAll(".counties")
			.select('title')
			.text(function(d) { return "" });
	}
	
	function result_2000() { 
		console.log("result_2000"); 
		
		g.selectAll('.title')
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".states")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".counties")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".state-borders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".republican2000TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "red");
		g.selectAll(".republican2000FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "lightcoral");
		g.selectAll(".democrat2000TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "blue");
		g.selectAll(".democrat2000FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "steelblue");
		
		g.selectAll(".states")
			.select('title')
			.text(function (d) {
				let arr = stateInfo["2000"][d.id];
				if (arr) {
					return stateInfo["2000"][d.id][0] + "\n" + 
						stateInfo["2000"][d.id][1] + "\n" + 
						stateInfo["2000"][d.id][2] + "%";
				}  
		});
		g.selectAll(".counties")
			.select('title')
			.text(function (d) {
				let arr = countyInfo["2000"][d.id];
				if (arr) {
					return countyInfo["2000"][d.id][0] + "\n" + 
						countyInfo["2000"][d.id][1] + "\n" + 
						countyInfo["2000"][d.id][2] + "%";
				}  
		});
	}
	
	function result_2004() { 
		console.log("result_2004"); 
		
		g.selectAll(".republican2004TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "red");
		g.selectAll(".republican2004FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "lightcoral");
		g.selectAll(".democrat2004TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "blue");
		g.selectAll(".democrat2004FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "steelblue");
		
		g.selectAll(".states")
			.select('title')
			.text(function (d) {
				let arr = stateInfo["2004"][d.id];
				if (arr) {
					return stateInfo["2004"][d.id][0] + "\n" + 
						stateInfo["2004"][d.id][1] + "\n" + 
						stateInfo["2004"][d.id][2] + "%";
				}  
		});
		g.selectAll(".counties")
			.select('title')
			.text(function (d) {
				let arr = countyInfo["2004"][d.id];
				if (arr) {
					return countyInfo["2004"][d.id][0] + "\n" + 
						countyInfo["2004"][d.id][1] + "\n" + 
						countyInfo["2004"][d.id][2] + "%";
				}  
		});
	}
	function result_2008() { 
		console.log("result_2008"); 
		
		g.selectAll(".republican2008TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "red");
		g.selectAll(".republican2008FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "lightcoral");
		g.selectAll(".democrat2008TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "blue");
		g.selectAll(".democrat2008FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "steelblue");
		
		g.selectAll(".states")
			.select('title')
			.text(function (d) {
				let arr = stateInfo["2008"][d.id];
				if (arr) {
					return stateInfo["2008"][d.id][0] + "\n" + 
						stateInfo["2008"][d.id][1] + "\n" + 
						stateInfo["2008"][d.id][2] + "%";
				}  
		});
		g.selectAll(".counties")
			.select('title')
			.text(function (d) {
				let arr = countyInfo["2008"][d.id];
				if (arr) {
					return countyInfo["2008"][d.id][0] + "\n" + 
						countyInfo["2008"][d.id][1] + "\n" + 
						countyInfo["2008"][d.id][2] + "%";
				}  
		});
	}
	function result_2012() { 
		console.log("result_2012"); 
		
		g.selectAll(".republican2012TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "red");
		g.selectAll(".republican2012FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "lightcoral");
		g.selectAll(".democrat2012TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "blue");
		g.selectAll(".democrat2012FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "steelblue");
		
		g.selectAll(".states")
			.select('title')
			.text(function (d) {
				let arr = stateInfo["2012"][d.id];
				if (arr) {
					return stateInfo["2012"][d.id][0] + "\n" + 
						stateInfo["2012"][d.id][1] + "\n" + 
						stateInfo["2012"][d.id][2] + "%";
				}  
		});
		g.selectAll(".counties")
			.select('title')
			.text(function (d) {
				let arr = countyInfo["2012"][d.id];
				if (arr) {
					return countyInfo["2012"][d.id][0] + "\n" + 
						countyInfo["2012"][d.id][1] + "\n" + 
						countyInfo["2012"][d.id][2] + "%";
				}  
		});
	}
	function result_2016() { 
		console.log("result_2016"); 
		
		g.selectAll(".republican2016TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "red");
		g.selectAll(".republican2016FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "lightcoral");
		g.selectAll(".democrat2016TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "blue");
		g.selectAll(".democrat2016FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "steelblue");
		
		g.selectAll(".states")
			.select('title')
			.text(function (d) {
				let arr = stateInfo["2016"][d.id];
				if (arr) {
					return stateInfo["2016"][d.id][0] + "\n" + 
						stateInfo["2016"][d.id][1] + "\n" + 
						stateInfo["2016"][d.id][2] + "%";
				}  
		});
		g.selectAll(".counties")
			.select('title')
			.text(function (d) {
				let arr = countyInfo["2016"][d.id];
				if (arr) {
					return countyInfo["2016"][d.id][0] + "\n" + 
						countyInfo["2016"][d.id][1] + "\n" + 
						countyInfo["2016"][d.id][2] + "%";
				}  
		});
	}
	function swing_2016() { 
		console.log("swing_2016");
		
		g.selectAll(".states")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".counties")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".state-borders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".republican2016TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "red");
		g.selectAll(".republican2016FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "black");
		g.selectAll(".democrat2016TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "blue");
		g.selectAll(".democrat2016FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "black");
		
		g.selectAll(".states")
			.select('title')
			.text(function (d) {
				let arr = stateInfo["2004"][d.id];
				if (arr) {
					return stateInfo["2004"][d.id][0] + "\n" + 
						stateInfo["2004"][d.id][1] + "\n" + 
						stateInfo["2004"][d.id][2] + "%";
				}  
		});
		g.selectAll(".counties")
			.select('title')
			.text(function (d) {
				let arr = countyInfo["2004"][d.id];
				if (arr) {
					return countyInfo["2004"][d.id][0] + "\n" + 
						countyInfo["2004"][d.id][1] + "\n" + 
						countyInfo["2004"][d.id][2] + "%";
				}  
		});
	}
	function florida() { 
		console.log("florida"); 
		
		g.selectAll(".states")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".state-borders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".counties")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".states")
			.select('title')
			.text(function(d) { return "" });
		g.selectAll(".counties")
			.select('title')
			.text(function(d) { return "" });
	}
	function iowa() { console.log("iowa"); }
	function michigan() { console.log("michigan"); }
	function ohio() { console.log("ohio"); }
	function pennsylvania() { console.log("pennsylvania"); }
	function wisconsin() { console.log("wisconsin"); }
	function prediction_2020() { console.log("prediction_2020"); }
	
	/**
	 * DATA FUNCTIONS
	 *
	 * Used to coerce the data into the formats we need to visualize
	 */
	function getStateInfo() {
		d3.csv(state_csv).then(function(data) {
			for (var j = 0; j < years.length; j++) {
//				console.log('stateInfo' + years[j].toString())
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
		});
	}
	
	function getCountyInfo() {
		d3.csv(county_csv).then(function(data) {
			for (var j = 0; j < years.length; j++) {
//				console.log('countyInfo' + years[j].toString())
				var year = years[j].toString();
				countyInfo[year] = {};
				for (var i = 0; i < data.length; i++) {
					var temp_id = Math.trunc(data[i].FIPS).toString(); 
					if (temp_id.length == 4) {
						temp_id = "0".concat(temp_id);
					}
					var yper = year + "_percent"
					var ycan = year + "_cand"
					var percent = (parseFloat(data[i][yper]) * 100).toPrecision(3);
					countyInfo[year][temp_id] = [data[i]["county"],data[i][ycan],percent];
				}	
			}
		});
	}
	
	function getStateWinners() {
		d3.csv(state_csv).then(function(data) {
			for (var i = 0; i < data.length; i++) {
				var temp_id = Math.trunc(data[i].FIPS).toString(); 
				if (temp_id.length == 1) {
					temp_id = "0".concat(temp_id);
				}
				stateWinners.push({id:temp_id,winner_name:[data[i]["party2000"] + "2000" + data[i]["Switch_1996_2000"],data[i]["party2004"] + "2004" + data[i]["Switch_2000_2004"],data[i]["party2008"] + "2008" + data[i]["Switch_2004_2008"],data[i]["party2012"] + "2012" + data[i]["Switch_2008_2012"],data[i]["party2016"] + "2016" + data[i]["Switch_2012_2016"]]});  

			} 
		});
	}
  
	function getCountyWinners() {
		d3.csv(county_csv).then(function(data) {
			for (var i = 0; i < data.length; i++) {
				var temp_id = Math.trunc(data[i].FIPS).toString(); 
				if (temp_id.length == 4) {
					temp_id = "0".concat(temp_id);
				}
				countyWinners.push({id:temp_id,winner_name:[data[i]["party2000"] + "2000" + data[i]["Switch_1996_2000"],data[i]["party2004"] + "2004" + data[i]["Switch_2000_2004"],data[i]["party2008"] + "2008" + data[i]["Switch_2004_2008"],data[i]["party2012"] + "2012" + data[i]["Switch_2008_2012"],data[i]["party2016"] + "2016" + data[i]["Switch_2012_2016"]]});  

			} 
		});
	}
	
	function clicked(d) {
		if (d3.select('.background').node() === this) return reset();

		if (active.node() === this) return reset();

		active.classed("active", false);
		active = d3.select(this).classed("active", true);

		var bounds = path.bounds(d),
			dx = bounds[1][0] - bounds[0][0],
			dy = bounds[1][1] - bounds[0][1],
			x = (bounds[0][0] + bounds[1][0]) / 2,
			y = (bounds[0][1] + bounds[1][1]) / 2,
			scale = .9 / Math.max(dx / width, dy / height),
			translate = [width / 2 - scale * x, height / 2 - scale * y];

		g.transition()
			.duration(750)
			.style("stroke-width", 1.5 / scale + "px")
			.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
	}
	
	function reset() {
		active.classed("active", false);
		active = d3.select(null);

		g.transition()
			.delay(100)
			.duration(750)
			.style("stroke-width", "1.5px")
			.attr('transform', 'translate('+margin.left+','+margin.top+')');
	}
	
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
	
	return chart;
};

/**
 * display - called once data has been loaded. sets up the scroller and displays the visualization.
 *
 * @param data - loaded tsv data
 */
function display() {
	var plot = scrollVis();
	d3.select('#vis').call(plot);
	var scroll = scroller().container(d3.select('#graphic'));
	scroll(d3.selectAll('.step'));
	scroll.on('active', function (index) {
		d3.selectAll('.step')
			.style('opacity', function (d, i) { return i === index ? 1 : 0.1; });
		plot.activate(index);
	});
}

display();