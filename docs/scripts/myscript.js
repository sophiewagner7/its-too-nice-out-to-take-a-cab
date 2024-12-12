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
const csvRaw = await d3.csv("../data-for-d3.csv");
const csvData = csvRaw.map(
  ({ temperature, temperature_change_since_prev_day, month, trip_count }) => (
  {
    temperature: +temperature,
    temperature_change_since_prev_day: +temperature_change_since_prev_day,
    month: +month,
    trip_count: +trip_count
  }
))

// Build our (square) SVG.
const plotDiv = d3.select("#plot")
const width = document.querySelector("main.content").offsetWidth;
const height = .6*width
const title = plotDiv.append("h2");
const text = plotDiv.append("p");
const svg = plotDiv
  .append("svg")
  .attr("width", width) 
  .attr("height", height);
const inputDiv = plotDiv.append("div")
inputDiv.append("input")
  .attr("type", "range")
  .attr("id", "temperature")
  .attr("name", "temperature")
  .attr("min", d3.min(csvData.map(n => +n.temperature)))
  .attr("max", d3.max(csvData.map(n => +n.temperature)))
  .attr("value", 25)
  .attr("step", 1);
inputDiv.append("label")
  .style("padding-left", "1.5rem")
  .attr("for", "temperature")
  .text("Temperature (°C)")
   
// Define our margins.
const margin = {top: 20, right: 30, bottom: 35, left: 55};

// Set fixed x-axis label.
svg.append("g")
  .append("text")
    .style("font-size", 10)
    .attr("text-anchor", "end")
    .attr("transform", `translate (${width - margin.right}, ${height - margin.bottom + 30})`)
    .text("Temperature (°C) →");
const yAxisLabel = svg.append("text")
    .style("font-size", 10)
    .attr("text-anchor", "end")
    .attr("transform", `translate(${margin.left - 45}, ${margin.top}) rotate(-90)`)
    .text(`More average hourly rides taken yesterday than at ${temperature}° →`);

// Create target <g>s.
const plot = svg.append("g")
  .attr("transform", `translate (${margin.left}, ${margin.top})`);
const xG = svg.append("g")
    .attr("class", "xAxis")
    .attr("transform", `translate (${margin.left}, ${height - margin.bottom})`)
const yG =  svg.append("g")
    .attr("class", "yAxis")
    .attr("transform", `translate (${margin.left}, ${margin.top})`)
    
// Define a fill.
const color = d3.scaleSequential(d3.interpolatePiYG);

const filterData = (temperature, csvData) => {
  const filteredData = csvData.filter(n => n.temperature == temperature)
    .filter(n => n.temperature_change_since_prev_day != "NA")
  const meanTrips = d3.mean(filteredData.map(n => n.trip_count));
  return {
    meanTrips,
    data: d3.flatRollup(
      filteredData, 
      v => d3.mean(v, d => d.trip_count) - meanTrips, 
      d => +temperature + d.temperature_change_since_prev_day
    )
    .sort((a, b) => a[0] - b[0])
  }
}

// Listen to the slider
d3.select("#temperature").on("input", function() {
  temperature = this.value
  makeChart(temperature, csvData);
});

const makeChart = (temperature, csvData) => {
  const {meanTrips, data} = filterData(temperature, csvData);
  const x = data.map(n => n[0]);
  const y = data.map(n => n[1]);
  const xScale = d3.scaleBand(
    d3.range(d3.min(x), d3.max(x) + 1, 1), 
    [0, width - margin.right - margin.left]
  ).paddingInner(.1);
  const yScale = d3.scaleLinear(
    [ d3.min(y), d3.max(y) ],
    [height - margin.top - margin.bottom, 0]
  );
  
  const xAxis = d3.axisBottom()
    .scale(xScale);
  const yAxis = d3.axisLeft()
    .scale(yScale);
  
  plot.selectAll("rect").remove();
  const bars = plot.selectAll("rect")
    .data(y)
  
  bars.enter() 
    .append("rect")
      .attr("x", (d, i) => xScale(x[i]))
      .attr("y", d => yScale(d) > yScale(0)? yScale(0) : yScale(d))
      .attr("height", d => Math.abs(yScale(d) - yScale(0)))
      .attr("fill", d => color(standardize(d, y)))
      .attr("width", xScale.bandwidth())
      .attr("data-temperature", (d, i) => x[i]);
  
  bars.exit()
    .remove();
      
  // Do some side effects.
  xG.call(xAxis);
  yG.call(yAxis);
  yAxisLabel.text(`More average hourly rides taken yesterday than at ${temperature}° →`);
  title.text(`Difference in Average Hourly Trips at ${temperature}° against the Temperature the Previous Day`);
  text.text(`Since October 2021, an average of ${f(meanTrips)} taxi and 
  Uber/Lyft rides have been taken in an hour when the weather was ${temperature}°.`);
}

const f = d3.format(",.4r")

const standardize = (value, y) => {
  if(value >= 0){
    return .5 * value/d3.max(y) + .5
  } else {
    return .5 - .5 * value/d3.min(y)
  }
}

// Initial run
makeChart(temperature, csvData);