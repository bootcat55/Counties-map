import * as d3 from 'd3';
import { json } from 'd3-fetch';

// Function to create the US states map
function createStateMap() {
    // Set up the SVG container for the states map
    const width = 1200;
    const height = 900;
    const svg = d3.select("#state-map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Load the GeoJSON for US states
    json('data/us-states.json').then(stateData => {
        // Create a projection and path generator
        const projection = d3.geoAlbersUsa()
            .fitSize([width, height], stateData);

        const pathGenerator = d3.geoPath().projection(projection);

        // Draw the states map
        svg.selectAll("path.state")
            .data(stateData.features)
            .enter()
            .append("path")
            .attr("class", "state")
            .attr("d", pathGenerator)
            .attr("fill", "blue")
            .attr("stroke", "#333") // Add border for states
            .attr("stroke-width", 1.5);

        // Tooltip for displaying state information
        const tooltip = d3.select("#state-tooltip")
            .attr("class", "tooltip")
            .style("display", "none");

        // Add interaction: on hover, show the state name
        svg.selectAll("path.state")
            .on("mouseover", function (event, d) {
                tooltip.style("display", "block")
                    .html(`State: ${d.properties.name}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("display", "none");
            });
    });
}

// Call the function to create the state map
createStateMap();
