//Brian Robinson 4/11/207
//UW-Madison GISWMP Master's Program
//Lab 2 D3 Coordinated Vizualiation

(function(){
	//var for data join
	var attrArray =["C_Cigar", "F_Cigar", "C_Cigarette", "F_Cigarette", "C_Smokeless", "F_Smokeless"];
	
	var attrArrayTranslate= {
		C_Cigar: "Current Cigar Users",
		F_Cigar: "Former Cigar Users",
		C_Cigarette: "Current Cigarette Users",
		F_Cigarette: "Former Cigarette Users",
		C_Smokeless: "Current Smokeless Tobacco Users",
		F_Smokeless: "Former Smokeless Tobacco Users"
	};
	
	var expressed =attrArray[0];
	
	//chart frame dimensions
	var chartWidth =window.innerWidth * 0.425,
			chartHeight =460,
			leftPadding =25,
			rightPadding =2,
			topBottomPadding=5,
			chartInnerWidth= chartWidth -leftPadding-rightPadding,
			chartInnerHeight= chartHeight-topBottomPadding *2,
			translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
	
	//Create a scale to dynamically proportion scale bars
	var yScale =d3.scaleLinear()
			.range([463, 0])
			.domain([0, 30]);

window.onload =setMap();

function setMap(){
	
		var width =window.innerWidth * 0.5,
			height =460;
		
		var zoom =d3.zoom()
			.scaleExtent([1,5])
			.on("zoom", zoomFunction);
		
		function zoomFunction(){
			var transformZoom =d3.zoomTransform(this);
			var zoomMap =d3.select("#mapg")
				.attr("transform", "translate(" +
					 transformZoom.x + "," + transformZoom.y + ")scale(" + transformZoom.k + ")" );
		}
	
		var map =d3.select("body")
			.append("svg")
			.attr("class", "map")
			.attr("width", width)
			.attr("height", height)
			.attr("id", "mapsvg")
            .append("g")
            .attr("id", "mapg")
            .call(zoom)
			.on("mousedown.zoom", null);
		
		var projection = d3.geoAlbersUsa()
    		.scale(950)
    		.translate([width / 2, height / 2]);
		
		var path = d3.geoPath()
        	.projection(projection);
	
		d3.queue()
			.defer(d3.csv, "data/smoking_stats.csv")
			.defer(d3.json, "data/census_state_boundaries.topojson")
			.await(callback);
	
		function callback(error, csvData, states){
			
			setGraticule(map,path);
			
			var stateLines = topojson.feature(states, states.objects.census_state_boundaries).features;
			
			var states = map.append("path")
                .datum(stateLines)
                .attr("class", "state")
                .attr("d", path);
			
			stateLines = joinData(stateLines, csvData);
			
			var colorScale = makeColorScale(csvData);
			
			setEnumerationUnits(stateLines, map, path,colorScale);
			
			setChart(csvData,colorScale);
			
			createDropdown(csvData);
		}
	function setGraticule(map,path){
			var graticule =d3.geoGraticule()
				.step([5,5]);
			
			var gratBackground =map.append("path")
				.datum(graticule.outline())
				.attr("class", "gratBackground")
				.attr("d", path);
			
			var gratLines = map.selectAll(".gratLines")
				.data(graticule.lines())
				.enter()
				.append("path")
				.attr("class", "gratLines")
				.attr("d", path);
	}
	
	function joinData(stateLines, csvData){
		for(var i = 0; i<csvData.length; i++){
				var csvState =csvData[i];
				var csvKey = csvState.NAME;
				
				for(var a = 0; a<stateLines.length; a++){
					var geojsonProps =stateLines[a].properties;
					var geojsonKey =geojsonProps.NAME;
					
					if (geojsonKey === csvKey){
						attrArray.forEach(function(attr){
							var val =parseFloat(csvState[attr]);
							geojsonProps[attr] = val;
						});
					}
				}
			}
		return stateLines;
	}
	
	function setEnumerationUnits(stateLines,map,path, colorScale){
		var enumStates =map.selectAll(".enumStates")
				.data(stateLines)
				.enter()
				.append("path")
				.attr("class", function(d){
					return "states "+ d.properties.NAME;
				})
				.attr("d",path)
				.style("fill", function(d){
            		return choropleth(d.properties, colorScale);
				})
				.on("mouseover", function(d){
					highlight(d.properties);
				})
				.on("mouseout", function(d){
					dehighlight(d.properties);
				})
				.on("mousemove", moveLabel);
		
		var desc =enumStates.append("desc")
			.text('{"stroke": "#FFF", "stroke-width" : "0.5px"}');
	}
	
	function makeColorScale(data){
		var colorClasses = [
			"#ffffd4","#fed98e","#fe9929","#d95f0e","#993404"
    		];
		
		var colorScale =d3.scaleThreshold()
			.range(colorClasses);
		
		var domainArray =[];
		
		for (var i =0; i<data.length; i++){
			var val =parseFloat(data[i][expressed]);
			domainArray.push(val);
		}
		
		var clusters =ss.ckmeans(domainArray, 5);
		
		domainArray =clusters.map(function(d){
			return d3.min(d);
		});	
		
		domainArray.shift();
			
		colorScale.domain(domainArray);
			
		return colorScale;
	}
	
	function choropleth(props, colorScale){
		
		var val =parseFloat(props[expressed]);
		
		if (typeof val === 'number' && !isNaN(val)){
			return colorScale(val);
		}else{
			return "#CCC";
		}
	}
	
	function setChart(csvData, colorScale){
			
		var chart =d3.select("body")
			.append("svg")
			.attr("width", chartWidth)
			.attr("height", chartHeight)
			.attr("class", "chart");
		
		var chartBackground =chart.append("rect")
			.attr("class", "chartBackground")
			.attr("width", chartInnerWidth)
			.attr("height", chartHeight)
			.attr("transform", translate);
		
		var yScale =d3.scaleLinear()
			.range([463, 0])
			.domain([0, 30]);
		
		var bars =chart.selectAll(".bar")
			.data(csvData)
			.enter()
			.append("rect")
			.sort(function(a, b){
            return b[expressed]-a[expressed];
        	})
			.attr("class", function (d){
				return "bar " + d.NAME;
			})
			.attr("width", chartInnerWidth / csvData.length - 1)
			.on("mouseover", highlight)
			.on("mouseout", dehighlight)
			.on("mousemove", moveLabel);	
		
		var desc =bars.append("desc")
			.text('{"stroke": "none", "stroke-width": "0px" }');
		
		var chartTitle = chart.append("text")
        	.attr("x", 40)
        	.attr("y", 40)
        	.attr("class", "chartTitle");
				
		 var yAxis = d3.axisLeft()
		 	.scale(yScale);
		 	
		  var axis = chart.append("g")
        	.attr("class", "axis")
        	.attr("transform", translate)
        	.call(yAxis);
		
		var chartFrame =chart.append("text")
			.attr("class", "chartFrame")
			.attr("width", chartInnerWidth)
			.attr("height",chartInnerHeight)
			.attr("transform", translate);
		
		updateChart(bars,csvData.length, colorScale);
	}
	
	function createDropdown(csvData){
		
		var dropdown =d3.select("body")
			.append("select")
			.attr("class", "dropdown")
			.on("change", function(){
				changeAttribute(this.value, csvData)
			});
		
		var titleOption = dropdown.append("option")
			.attr("class", "titleOption")
			.attr("disabled", "true")
			.text("Select Attribute");
		
		var attrOptions = dropdown.selectAll("attrOptions")
			.data(attrArray)
			.enter()
			.append("option")
			.attr("value", function(d){return d})
			.text(function(d){return attrArrayTranslate[d] });
	}
	
	function changeAttribute(attribute, csvData){
		
		expressed = attribute;
		
		var colorScale = makeColorScale(csvData);
		
		var newStates =map.selectAll(".states")
				.transition()
				.duration(1000)
				.style("fill", function(d){
            		return choropleth(d.properties, colorScale);
				});
		
		var bars =d3.selectAll(".bar")
			.sort(function(a,b){
				  return b[expressed]-a[expressed];
			})
			.transition()
			.delay(function(d,i){
				return i *20
			})
			.duration(500);
			
		updateChart(bars, csvData.length, colorScale);	
	}
	
	function updateChart(bars, n, colorScale){
		bars.attr("x", function(d,i){
			return i * (chartInnerWidth/ n)+ leftPadding;
		})
		.attr("height", function(d,i){
			return 463- yScale(parseFloat(d[expressed]));
		})
		.attr("y", function(d,i){
			return yScale(parseFloat(d[expressed])) + topBottomPadding;
		})
		.style("fill",function(d){
			return choropleth(d,colorScale);
		});
		
		var chartTitle =d3.select(".chartTitle")
			.text("Percentage of "+ attrArrayTranslate[expressed]);
	}
	
	function highlight(props){
		var selected =d3.selectAll("."+ props.NAME)
			.style("stroke", "gray")
			.style("stroke-width", "2");
		
		setLabel(props);
	}
	
	function dehighlight(props){
		var selected =d3.selectAll("." + props.NAME)
			.style("stroke", function(){
				return getStyle(this, "stroke");
			})
			.style("stroke-width", function(){
				return getStyle(this, "stroke-width");
			});
		d3.select(".infolabel")
			.remove();
	}
	
	function getStyle(element, styleName){
		var styleText =d3.select(element)
			.select("desc")
			.text();
		
		var styleObject =JSON.parse(styleText);
		
		return styleObject[styleName];
	}
	
	function setLabel(props){
		var labelAttribute = "<h1>" + props[expressed] +"%" +
			"</h1><b>" + attrArrayTranslate[expressed] + "</b>";
		
		var infolabel =d3.select("body")
			.append("div")
			.attr("class", "infolabel")
			.attr("id", props.NAME + "_label")
			.html(labelAttribute);
		
		var stateName =infolabel.append("div")
			.attr("class", "labelname")
			.html(props.NAME);
	}
	
	function moveLabel(){
		var labelWidth = d3.select(".infolabel")
            .node()     // returns DOM node
            .getBoundingClientRect()
            .width;
		
		 var x1 = d3.event.clientX + 10,
            y2 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y1 = d3.event.clientY - 25;
		
		 var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
		
		var y = d3.event.clientY < 75 ? y2 : y1;
		
		 d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
	}
		
}	
})();
