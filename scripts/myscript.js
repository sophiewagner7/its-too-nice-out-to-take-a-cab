// add your JavaScript/D3 to this file

// Set a baseline temperature
let temperature = 25;

/* Await loading the data
 interface TaxiWeatherData {
  month: string;
  temperature: string;
  temperature_change_since_prev_day: string;
  trip_count: string
  }
  
  NA is indicated by "NA." Should only affect temp. change.
*/
const data = await d3.csv("../data-for-d3.csv");

// Build our (square) SVG.
const plot = d3.select("#plot")
const width = document.querySelector("main.content").offsetWidth;
console.log(width);
const height = .6*width
const title = plot.append("h2");
const text = plot.append("p");
const svg = plot
  .append("svg")
  .attr("width", width) 
  .attr("height", height);
const inputDiv = plot.append("div")
inputDiv.append("input")
  .attr("type", "range")
  .attr("id", "temperature")
  .attr("name", "temperature")
  .attr("min", d3.min(data.map(n => +n.temperature)))
  .attr("max", d3.max(data.map(n => +n.temperature)))
  .attr("value", 25)
  .attr("step", 1);
inputDiv.append("label")
  .style("padding-left", "1.5rem")
  .attr("for", "temperature")
  .text("Temperature (°C)")
console.log(data.map(n => n.temperature))
   
// Define our margins.
const margin = {top: 20, right: 30, bottom: 30, left: 40};

// Define a fill.
const color = d3.scaleSequential(d3.interpolatePiYG);

const filterData = (temperature, data) => {
  const filteredData = data.filter(n => n.temperature == temperature)
    .filter(n => n.temperature_change_since_prev_day != "NA")
  const meanTrips = d3.mean(filteredData.map(n => +n.trip_count));
  return {
    meanTrips,
    data: d3.flatRollup(
      filteredData, 
      v => d3.mean(v, d => d.trip_count) - meanTrips, 
      d => temperature + +d.temperature_change_since_prev_day
    )
    .sort((a, b) => a[0] - b[0])
  }
}

// Listen to the slider
d3.select("#temperature").on("input", function() {
  temperature = this.value
  makeChart(temperature, data);
});

const makeChart = (temperature, csvData) => {
  const {meanTrips, data} = filterData(temperature, csvData);
  const x = data.map(n => n[0]);
  const y = data.map(n => n[1]);
  const xScale = d3.scaleBand(
    x, 
    [0, width - margin.right - margin.left]
  ).paddingInner(.1);
  const yScale = d3.scaleLinear(
    [d3.min(y), d3.max(y)], 
    [height - margin.top - margin.bottom, 0]
  );
  
  const xAxis = d3.axisBottom()
    .scale(xScale);
  const yAxis = d3.axisLeft()
    .scale(yScale);
  
  //console.log(d3.min(y), d3.max(y));
  //console.log(yScale(d3.max(y)), yScale(d3.min(y)), yScale(0));
  svg.selectAll("g").remove()
  const g = svg.append("g")
    .attr("transform", `translate (${margin.left}, ${margin.top})`);
  g.selectAll("rect")
    .data(y)
    .enter() 
    .append("rect")
      .attr("x", (d, i) => xScale(i + d3.min(x)))
      .attr("y", d => yScale(d) > yScale(0)? yScale(0) : yScale(d))
      .attr("width", xScale.bandwidth())
      .attr("height", d => Math.abs(yScale(d) - yScale(0)))
      .attr("fill", d => color(standardize(d, y)));
      
  svg.append("g")
    .attr("class", "xAxis")
    .attr("transform", `translate (${margin.left}, ${height - margin.bottom})`)
    .call(xAxis);

  svg.append("g")
    .attr("class", "yAxis")
    .attr("transform", `translate (${margin.left}, ${margin.top})`)
    .call(yAxis);
    
  title.text(`Difference in Average Hourly Trips at ${temperature}° against the Temperature the Previous Day`);
  text.text(`Since October 2021, an average of ${meanTrips} taxi and 
  Uber/Lyft rides have been taken in an hour when the weather was ${temperature}°.`);
}

const standardize = (value, y) => (value - d3.min(y)) / (d3.max(y) - d3.min(y));
  
// Initial run
makeChart(temperature, data);