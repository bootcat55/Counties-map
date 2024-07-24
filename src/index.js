import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';

// Function to read the CSV file
function readCsvFile(url, callback) {
    d3.csv(url).then(data => {
        // Parse numeric values
        data.forEach(d => {
            d.FIPS = +d.FIPS;
            d.Republican = +d.Republican;
            d.Democrat = +d.Democrat;
            d.vote_total = d.Republican + d.Democrat;
            d.percentage_difference = (d.Republican - d.Democrat) / d.vote_total;
        });
        callback(data);
    });
}

// Load the CSV data
readCsvFile('data/delaware_votes.csv', data => {
    console.log("CSV Data:", data);

    // Create an SVG container
    const width = 500;
    const height = 300;
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Load GeoJSON for all counties
    json('data/geojson-counties-fips.json').then(geoData => {
        // Filter GeoJSON to include only Delaware counties using the FIPS codes
        const delawareFipsCodes = data.map(d => d.FIPS);
        const filteredGeoData = {
            type: "FeatureCollection",
            features: geoData.features.filter(feature => delawareFipsCodes.includes(+feature.id))
        };

        // Merge the CSV data with filtered GeoJSON
        filteredGeoData.features.forEach(feature => {
            const county = data.find(d => d.FIPS === +feature.id);
            if (county) {
                feature.properties.name = county.County;
                feature.properties.percentage_difference = county.percentage_difference;
            } else {
                feature.properties.name = 'Unknown';
                feature.properties.percentage_difference = 0;
            }
        });

        // Create a projection and path generator
        const projection = d3.geoAlbersUsa()
            .fitSize([width, height], filteredGeoData);

        const path = d3.geoPath().projection(projection);

        // Tooltip div
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("display", "none");

        // Draw the map
        svg.selectAll("path")
            .data(filteredGeoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => {
                const percentageDifference = d.properties.percentage_difference;
                return percentageDifference > 0 
                    ? d3.interpolateReds(percentageDifference) 
                    : d3.interpolateBlues(-percentageDifference);
            })
            .attr("stroke", "#000")
            .on("mouseover", function(event, d) {
                tooltip.style("display", "block")
                    .html(`County: ${d.properties.name}<br>Percentage Difference: ${(Math.abs(d.properties.percentage_difference) * 100).toFixed(1)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("display", "none");
            });
    });
});
