// JavaScript Document

// Scroller code adapted from https://github.com/vlandham/scroll_demo
// Map code adapted from http://bl.ocks.org/ElefHead/ebff082d41ef8b9658059c408096f782
// Line graph code adapted from https://bl.ocks.org/larsenmtl/e3b8b7c2ca4787f77d78f58d41c3da91

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
		top: 20,
        right: 80,
        bottom: 30,
        left: 50
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
	var parseDate = d3.timeParse("%Y%m%d");
	
	// Set the ranges
	var x = d3.scaleTime().range([0, width]);
	var y = d3.scaleLinear().range([height, 0]);

	// Define the axes
	var xAxis = d3.axisBottom(x);
	var yAxis = d3.axisLeft(y);
	
	var color = d3.scaleOrdinal(d3.schemeCategory10)
		.range(['#27AE60', '#7D3C98', '#ff9446']); 
	
	// Define the line
	var percentline = d3.line()	
		.x(function(d) { return x(d.date); })
		.y(function(d) { return y(d.percent); });
	var line = d3.line()
		.curve(d3.curveCatmullRom.alpha(0.5))
		.x(function(d) {
			return x(d.date);
		})
		.y(function(d) {
			return y(d.percent);
		});
	
	var LEGEND_LOCATION = -90;
	
	var county_csv = require('./FP_county_winners.csv');
	var state_csv = require('./FP_state_winners.csv');
	var county_csv = require('./FP_county_winners.csv');
	var state_csv = require('./FP_state_winners.csv');
	
	var fl_biden_sanders = require('./fl_biden_sanders.tsv');
	var fl_biden_trump = require('./fl_biden_trump.tsv');
	var fl_sanders_trump = require('./fl_sanders_trump.tsv');
	var ia_biden_sanders = require('./ia_biden_sanders.tsv');
	var ia_biden_trump = require('./ia_biden_trump.tsv');
	var ia_sanders_trump = require('./ia_sanders_trump.tsv');
	var mi_biden_sanders = require('./mi_biden_sanders.tsv');
	var mi_biden_trump = require('./mi_biden_trump.tsv');
	var mi_sanders_trump = require('./mi_sanders_trump.tsv');
	var oh_biden_sanders = require('./oh_biden_sanders.tsv');
	var oh_biden_trump = require('./oh_biden_trump.tsv');
	var oh_sanders_trump = require('./oh_sanders_trump.tsv');
	var pa_biden_sanders = require('./pa_biden_sanders.tsv');
	var pa_biden_trump = require('./pa_biden_trump.tsv');
	var pa_sanders_trump = require('./pa_sanders_trump.tsv');
	var wi_biden_sanders = require('./wi_biden_sanders.tsv');
	var wi_biden_trump = require('./wi_biden_trump.tsv');
	var wi_sanders_trump = require('./wi_sanders_trump.tsv');
	
	var polls = [fl_biden_sanders, fl_biden_trump, fl_sanders_trump, ia_biden_sanders, ia_biden_trump, ia_sanders_trump, mi_biden_sanders, mi_biden_trump, mi_sanders_trump, oh_biden_sanders, oh_biden_trump, oh_sanders_trump, pa_biden_sanders, pa_biden_trump, pa_sanders_trump, wi_biden_sanders, wi_biden_trump, wi_sanders_trump];
	
	var classnames = ["fl_biden_sanders", "fl_biden_trump", "fl_sanders_trump", "ia_biden_sanders", "ia_biden_trump", "ia_sanders_trump", "mi_biden_sanders", "mi_biden_trump", "mi_sanders_trump", "oh_biden_sanders", "oh_biden_trump", "oh_sanders_trump", "pa_biden_sanders", "pa_biden_trump", "pa_sanders_trump", "wi_biden_sanders", "wi_biden_trump", "wi_sanders_trump"];
	
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
			.attr("x", width / 2)
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
		
		// transition
		g.append("text")
			.attr("class", "lookahead")
			.attr("x", width / 2)
			.attr("y", height / 3)
			.text("A look ahead")
			.style("opacity", 0);
		
		var i = 0;
		polls.forEach(function(d) {
			d3.tsv(d).then(function(data) {
				var classname = classnames[i];
				i++;
				
				color.domain(d3.keys(data[0]).filter(function(key) {
					return key !== "date";
				}));
				
				data.forEach(function(d) {
					d.date = parseDate(d.date);
				});
				
				var candidates = color.domain().map(function(name) {
					return {
						name: name,
						values: data.map(function(d) {
							return {
								date: d.date,
								percent: +d[name]
							};
						})
					};
				});
				
				x.domain(d3.extent(data, function(d) {
					return d.date;
				}));
				
				y.domain([ 5
					// d3.min(candidates, function(c) {
					// 	return d3.min(c.values, function(v) {
					// 		return v.percent - 1;
					// 	});
					// })
					,
					d3.max(candidates, function(c) {
						return d3.max(c.values, function(v) {
							return v.percent + 1;
						});
					})
				]);
				
				
				g.append("g")
					.attr("class", "x axis " + classname)
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis)
					.style("opacity", 0);
				
				g.append("g")
					.attr("class", "y axis " + classname)
					.call(yAxis)
					.style("opacity", 0)
					.append("text")
					.attr("transform", "rotate(-90)")
					.attr("y", 6)
					.attr("dy", ".71em")
					.style("text-anchor", "end")
					.text("Polling Percent");
				
				var candidate = g.selectAll(".candidates")
					.data(candidates)
					.enter().append("g")
					.attr("class", "candidate " + classname)
					.style("opacity", 0);;
				
				candidate.append("path")
					.attr("class", "line")
					.attr("d", function(d) {
						return line(d.values);
					})
					.style("stroke", function(d) {
						return color(d.name);
					});
				
				candidate.append("text")
					.datum(function(d) {
						return {
							name: d.name,
							value: d.values[d.values.length - 1]
						};
					})
					.attr("transform", function(d) {
						return "translate(" + x(d.value.date) + "," + y(d.value.percent) + ")";
					})
					.attr("x", 3)
					.attr("dy", ".35em")
					.text(function(d) {
						return d.name;
					});
				
				var mouseG = g.append("g")
					.attr("class", "mouse-over-effects " + classname)
					.attr("opacity", 0);
				
//				mouseG.append("path") // this is the black vertical line to follow mouse
//					.attr("class", "mouse-line " + classname)
//					.style("stroke", "black")
//					.style("stroke-width", "1px")
//					.style("opacity", "0");
				
				var lines = document.getElementsByClassName('line');
				
				var mousePerLine = mouseG.selectAll('.mouse-per-line')
					.data(candidates)
					.enter()
					.append("g")
					.attr("class", "mouse-per-line " + classname);
				
				mousePerLine.append("circle")
					.attr("r", 7)
					.style("stroke", function(d) {
						return color(d.name);
					})
					.style("fill", "none")
					.style("stroke-width", "1px")
					.style("opacity", "0");
				
				mousePerLine.append("text")
					.attr("transform", "translate(10,3)");
				
				mouseG.append('svg:rect') // append a rect to catch mouse movements on canvas
					.attr('width', width) // can't catch mouse events on a g element
					.attr('height', height)
					.attr('fill', 'none')
					.attr('pointer-events', 'all')
					.on('mouseout', function() { // on mouse out hide line, circles and text
						d3.select(".mouse-line")
							.style("opacity", "0");
						d3.selectAll(".mouse-per-line circle")
							.style("opacity", "0");
						d3.selectAll(".mouse-per-line text")
							.style("opacity", "0");
					})
					.on('mouseover', function() { // on mouse in show line, circles and text
						d3.select(".mouse-line")
							.style("opacity", "1");
						d3.selectAll(".mouse-per-line circle")
							.style("opacity", "1");
						d3.selectAll(".mouse-per-line text")
							.style("opacity", "1");
					})
					.on('mousemove', function() { // mouse moving over canvas
						var mouse = d3.mouse(this);
						d3.select(".mouse-line")
							.attr("d", function() {
								var d = "M" + mouse[0] + "," + height;
								d += " " + mouse[0] + "," + 0;
								return d;
						});
						d3.selectAll(".mouse-per-line")
							.attr("transform", function(d, i) {
								var xDate = x.invert(mouse[0]),
									bisect = d3.bisector(function(d) { return d.date; }).right,
									idx = bisect(d.values, xDate);
            
								var beginning = 0,
									end = lines[i].getTotalLength(),
									target = null;

								while (true){
									target = Math.floor((beginning + end) / 2);
									pos = lines[i].getPointAtLength(target);
									if ((target === end || target === beginning) && pos.x !== mouse[0]) {
										break;
									}
									if (pos.x > mouse[0])      end = target;
									else if (pos.x < mouse[0]) beginning = target;
									else break; //position found
								}
            
								d3.select(this).select('text')
									.text(y.invert(pos.y).toFixed(2));
              
								return "translate(" + mouse[0] + "," + pos.y +")";
						});
					});
			});
		});
		
		// summary
		g.append("text")
			.attr("class", "summary")
			.attr("x", width / 2)
			.attr("y", height / 3)
			.text("Summary")
			.style("opacity", 0);
		
		// prediction
		g.append("text")
			.attr("class", "prediction")
			.attr("x", width / 2)
			.attr("y", height / 3)
			.text("Bye Bye Trump, 2020")
			.style("opacity", 0);
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
		activateFunctions[7] = transition;
		activateFunctions[8] = florida;
		activateFunctions[9] = iowa;
		activateFunctions[10] = michigan;
		activateFunctions[11] = ohio;
		activateFunctions[12] = pennsylvania;
		activateFunctions[13] = wisconsin;
		activateFunctions[14] = summary1;
		activateFunctions[15] = summary2;
		activateFunctions[16] = summary3;
		activateFunctions[17] = summary4;
		activateFunctions[18] = build_anticipation;
		activateFunctions[19] = prediction_2020;
		activateFunctions[20] = references;
	};
	
	/**
	 * ACTIVATE FUNCTIONS
	 *
	 * These will be called when their section is scrolled to.
	 */
	function show_title() { 
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
		g.selectAll("#counties")
			.attr("display", "inline");
		g.selectAll("#states")
			.attr("display", "inline");
		g.selectAll("#state-borders")
			.attr("display", "inline");
		
		g.selectAll("#states")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll("#counties")
			.transition()
			.duration(500)
			.style("opacity", 1);
		g.selectAll("#state-borders")
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
		
		g.selectAll('.lookahead')
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function transition() {
		g.selectAll("#states")
			.attr("display", "none");
		g.selectAll("#counties")
			.attr("display", "none");
		g.selectAll("#state-borders")
			.attr("display", "none");
		g.selectAll("#states")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll("#state-borders")
			.transition()
			.duration(500)
			.style("opacity", 0)
			.style("display", "none");
		g.selectAll("#counties")
			.transition()
			.duration(500)
			.style("opacity", 0)
			.style("display", "none");
		g.selectAll(".states")
			.select('title')
			.text(function(d) { return "" });
		g.selectAll(".counties")
			.select('title')
			.text(function(d) { return "" });
		
		g.selectAll('.lookahead')
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		g.selectAll(".fl_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".fl_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".fl_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function florida() { 
		g.selectAll('.lookahead')
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".fl_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		d3.select("#fl_biden_sanders")
			.on("click", function(d,i) {
				g.selectAll(".fl_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".fl_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".fl_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#fl_biden_trump")
			.on("click", function(d,i) {
				g.selectAll(".fl_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".fl_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".fl_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#fl_sanders_trump")
			.on("click", function(d,i) {
				g.selectAll(".fl_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".fl_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".fl_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
			}); 
		
		g.selectAll(".ia_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".ia_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".ia_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function iowa() { 
		g.selectAll(".fl_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".fl_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".fl_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".ia_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		d3.select("#io_biden_sanders")
			.on("click", function(d,i) {
				g.selectAll(".ia_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".ia_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".ia_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#io_biden_trump")
			.on("click", function(d,i) {
				g.selectAll(".ia_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".ia_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".ia_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#io_sanders_trump")
			.on("click", function(d,i) {
				g.selectAll(".ia_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".ia_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".ia_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
			}); 
		
		g.selectAll(".mi_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".mi_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".mi_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function michigan() { 
		g.selectAll(".ia_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".ia_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".ia_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".mi_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		d3.select("#mi_biden_sanders")
			.on("click", function(d,i) {
				g.selectAll(".mi_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".mi_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".mi_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#mi_biden_trump")
			.on("click", function(d,i) {
				g.selectAll(".mi_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".mi_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".mi_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#mi_sanders_trump")
			.on("click", function(d,i) {
				g.selectAll(".mi_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".mi_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".mi_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
			});   
		
		g.selectAll(".oh_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".oh_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".oh_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function ohio() { 
		g.selectAll(".mi_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".mi_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".mi_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".oh_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		d3.select("#oh_biden_sanders")
			.on("click", function(d,i) {
				g.selectAll(".oh_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".oh_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".oh_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#oh_biden_trump")
			.on("click", function(d,i) {
				g.selectAll(".oh_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".oh_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".oh_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#oh_sanders_trump")
			.on("click", function(d,i) {
				g.selectAll(".oh_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".oh_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".oh_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
			}); 
		
		g.selectAll(".pa_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".pa_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".pa_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function pennsylvania() { 
		g.selectAll(".oh_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".oh_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".oh_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".pa_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		d3.select("#pa_biden_sanders")
			.on("click", function(d,i) {
				g.selectAll(".pa_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".pa_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".pa_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#pa_biden_trump")
			.on("click", function(d,i) {
				g.selectAll(".pa_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".pa_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".pa_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#pa_sanders_trump")
			.on("click", function(d,i) {
				g.selectAll(".pa_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".pa_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".pa_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
			}); 
		
		g.selectAll(".wi_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".wi_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".wi_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function wisconsin() { 
		g.selectAll(".pa_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".pa_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".pa_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll(".wi_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 1);
		
		d3.select("#wi_biden_sanders")
			.on("click", function(d,i) {
				g.selectAll(".wi_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".wi_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".wi_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#wi_biden_trump")
			.on("click", function(d,i) {
				g.selectAll(".wi_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".wi_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
				g.selectAll(".wi_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
			});   
		d3.select("#wi_sanders_trump")
			.on("click", function(d,i) {
				g.selectAll(".wi_biden_sanders")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".wi_biden_trump")
					.transition()
					.duration(500)
					.style("opacity", 0);
				g.selectAll(".wi_sanders_trump")
					.transition()
					.duration(500)
					.style("opacity", 1);
			}); 
		
		g.selectAll('.summary')
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function summary1() {
		g.selectAll(".wi_biden_sanders")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".wi_biden_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		g.selectAll(".wi_sanders_trump")
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll('.summary')
			.transition()
			.duration(500)
			.style("opacity", 1);
	}
	
	function summary2() {}
	
	function summary3() {}
	
	function summary4() {
		g.selectAll('.summary')
			.transition()
			.duration(500)
			.style("opacity", 1);
	}
	
	function build_anticipation() {
		g.selectAll('.summary')
			.transition()
			.duration(500)
			.style("opacity", 0);
		
		g.selectAll('.prediction')
			.transition()
			.duration(500)
			.style("opacity", 0);
	}
	
	function prediction_2020() { 
		g.selectAll('.prediction')
			.transition()
			.duration(500)
			.style("opacity", 1);
	}
	
	function references() {
		g.selectAll('.prediction')
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
//		active.transition()
//			.duration(500)
//			.attr("display", "none");

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
//		active.transition()
//			.duration(500)
//			.attr("display", "block");
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