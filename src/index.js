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
//		top: 10,
//		bottom: 10,
//		left: 10,
//		right:10
		top: 30,
		bottom: 70,
		left: 50,
		right: 20
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
	
	// Parse the date
	var parseDate = d3.timeParse("%m/%d/%y");
	
	// Set the ranges
	var x = d3.scaleTime().range([0, width]);
	var y = d3.scaleLinear().range([height, 0]);

	// Define the axes
	var xAxis = d3.axisBottom(x);
	var yAxis = d3.axisLeft(y);
	
	// Define the line
	var percentline = d3.line()	
		.x(function(d) { return x(d.date); })
		.y(function(d) { return y(d.pct); });
	
	var county_csv = require('./FP_county_winners.csv');
	var state_csv = require('./FP_state_winners.csv');
	var county_csv = require('./FP_county_winners.csv');
	var state_csv = require('./FP_state_winners.csv');
	
	var fl_biden = require('./FL_biden_v_trump.csv');
	var fl_sanders = require('./FL_sanders_v_trump.csv');
	var io_biden = require('./IO_biden_v_trump.csv');
	var io_sanders = require('./IO_sanders_v_trump.csv');
	var mi_biden = require('./MI_biden_v_trump.csv');
	var mi_sanders = require('./MI_sanders_v_trump.csv');
	var oh_biden = require('./OH_biden_v_trump.csv');
	var oh_sanders = require('./OH_sanders_v_trump.csv');
	var pa_biden = require('./PA_biden_v_trump.csv');
	var pa_sanders = require('./PA_sanders_v_trump.csv');
	var wi_biden = require('./WI_biden_v_trump.csv');
	var wi_sanders = require('./WI_sanders_v_trump.csv');
	
	var polls = [fl_biden, fl_sanders, io_biden, io_sanders, mi_biden, mi_sanders, oh_biden, oh_sanders, pa_biden, pa_sanders, wi_biden, wi_sanders];
	
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
		
		polls.forEach(function(d) {
			d3.csv(d).then(function(data) {
				data.forEach(function(d) {
					d.date = parseDate(d.date);
					d.pct = +d.pct;
				});

				x.domain(d3.extent(data, function(d) { return d.date; }));
				y.domain([d3.min(data, function(d) { return d.pct; }) - 2, 
						  d3.max(data, function(d) { return d.pct; }) + 2]);

				var dataNest = d3.nest()
					.key(function(d) {return d.answer;})
					.entries(data);

				var color = d3.scaleOrdinal(d3.schemeCategory10);

				legendSpace = width/dataNest.length;

				dataNest.forEach(function(d,i) {
					g.append("path")
						.attr("class", "line " + data[0].state + data[0].answer)
						.style("stroke", function() {
							return d.color = color(d.key);
						})
						.attr("id", 'tag'+d.key.replace(/\s+/g, ''))
						.attr("d", percentline(d.values))
						.style("opacity", 0);

					g.append("text")
						.attr("x", (legendSpace/2)+i*legendSpace)  // space legend
						.attr("y", height + (margin.bottom/2)+ 5)
						.attr("class", "legend " + data[0].state + data[0].answer)    // style the legend
						.style("fill", function() { // Add the colours dynamically
							return d.color = color(d.key); })
						.on("click", function(){
							// Determine if current line is visible 
							var active   = d.active ? false : true,
							newOpacity = active ? 0 : 1; 
							// Hide or show the elements based on the ID
							d3.select("#tag"+d.key.replace(/\s+/g, ''))
								.transition().duration(100) 
								.style("opacity", newOpacity); 
							// Update whether or not the elements are active
							d.active = active;
							})  
						.text(d.key)
						.style("opacity", 0);
				});
				
				// Add the X Axis
				g.append("g")
					.attr("class", "x axis " + data[0].state + data[0].answer)
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis)
					.style("opacity", 0);

				// Add the Y Axis
				g.append("g")
					.attr("class", "y axis " + data[0].state + data[0].answer)
					.call(yAxis)
					.style("opacity", 0);
			});
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
		activateFunctions[7] = florida_biden;
		activateFunctions[8] = florida_sanders;
		activateFunctions[9] = iowa_biden;
		activateFunctions[10] = iowa_sanders;
		activateFunctions[11] = michigan_biden;
		activateFunctions[12] = michigan_sanders;
		activateFunctions[13] = ohio_biden;
		activateFunctions[14] = ohio_sanders;
		activateFunctions[15] = pennsylvania_biden;
		activateFunctions[16] = pennsylvania_sanders;
		activateFunctions[17] = wisconsin_biden;
		activateFunctions[18] = wisconsin_sanders;
		activateFunctions[19] = prediction_2020;
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
			.style("fill", "#e60000");
		g.selectAll(".republican2000FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "#ff8080");
		g.selectAll(".democrat2000TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "#0066cc");
		g.selectAll(".democrat2000FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "#4da6ff");
		
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
			.style("fill", "#e60000");
		g.selectAll(".republican2004FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "#ff8080");
		g.selectAll(".democrat2004TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "#0066cc");
		g.selectAll(".democrat2004FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "#4da6ff");
		
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
			.style("fill", "#e60000");
		g.selectAll(".republican2008FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "#ff8080");
		g.selectAll(".democrat2008TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "#0066cc");
		g.selectAll(".democrat2008FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "#4da6ff");
		
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
			.style("fill", "#e60000");
		g.selectAll(".republican2012FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "#ff8080");
		g.selectAll(".democrat2012TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "#0066cc");
		g.selectAll(".democrat2012FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "#4da6ff");
		
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
			.style("fill", "#e60000");  // dark red
		g.selectAll(".republican2016FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "#ff8080"); // light coral
		g.selectAll(".democrat2016TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "#0066cc"); // blue
		g.selectAll(".democrat2016FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "#4da6ff"); // light blue
		
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
			.style("fill", "#e60000");
		g.selectAll(".republican2016FALSE")
			.transition('color')
			.duration(500)
			.style("fill", "black");
		g.selectAll(".democrat2016TRUE")
			.transition('color')
			.duration(500)
			.style("fill", "#0066cc");
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
		
		g.selectAll(".FloridaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axisFloridaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	function florida_biden() { 
		console.log("florida_biden"); 
		
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
		
		g.selectAll(".FloridaBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".FloridaBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".FloridaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".FloridaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function florida_sanders() {
		console.log("florida_sanders");
		
		g.selectAll(".FloridaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".FloridaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".FloridaSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".FloridaSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".IowaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".IowaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function iowa_biden() { 
		console.log("iowa_biden"); 
		
		g.selectAll(".FloridaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".FloridaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".IowaBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".IowaBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".IowaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".IowaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function iowa_sanders() {
		console.log("iowa_sanders");
		
		g.selectAll(".IowaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".IowaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".IowaSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".IowaSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".MichiganBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".MichiganBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function michigan_biden() { 
		console.log("michigan_biden");
		
		g.selectAll(".IowaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".IowaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".MichiganBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".MichiganBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".MichiganSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".MichiganSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function michigan_sanders() {
		console.log("michigan_sanders");
		
		g.selectAll(".MichiganBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".MichiganBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".MichiganSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".MichiganSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".OhioBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".OhioBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function ohio_biden() { 
		console.log("ohio_biden"); 
		
		g.selectAll(".MichiganSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".MichiganSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".OhioBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".OhioBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".OhioSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".OhioSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function ohio_sanders() {
		console.log("ohio_sanders");
		
		g.selectAll(".OhioBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".OhioBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".OhioSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".OhioSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".PennsylvaniaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".PennsylvaniaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function pennsylvania_biden() { 
		console.log("pennsylvania_biden"); 
		
		g.selectAll(".OhioSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".OhioSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".PennsylvaniaBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".PennsylvaniaBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".PennsylvaniaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".PennsylvaniaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function pennsylvania_sanders() {
		console.log("pennsylvania_sanders");
		
		g.selectAll(".PennsylvaniaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".PennsylvaniaBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".PennsylvaniaSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".PennsylvaniaSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".WisconsinBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".WisconsinBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function wisconsin_biden() { 
		console.log("wisconsin_biden"); 
		
		g.selectAll(".PennsylvaniaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".PennsylvaniaSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".WisconsinBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".WisconsinBiden")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".WisconsinSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".WisconsinSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function wisconsin_sanders() { 
		console.log("wisconsin_sanders");
		
		g.selectAll(".WisconsinBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".WisconsinBiden")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".WisconsinSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll(".axis")
			.selectAll(".WisconsinSanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
	}
	
	function prediction_2020() { 
		console.log("prediction_2020"); 
		
		g.selectAll(".WisconsinSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".axis")
			.selectAll(".WisconsinSanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
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