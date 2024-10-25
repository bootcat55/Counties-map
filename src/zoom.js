// zoom.js
import * as d3 from 'd3';

export function createZoomControls(svg, width, height) {
    // Create a zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 8]) // Limit zoom scale
        .translateExtent([[0, 0], [width, height]]) // Prevent panning out of bounds
        .on("zoom", zoomed);

    // Apply the zoom behavior to the SVG container
    svg.call(zoom);

    function zoomed(event) {
        const { transform } = event;

        svg.selectAll('path') // Apply zoom to all county paths
            .attr('transform', transform)
            .attr('stroke-width', 1 / transform.k); // Adjust stroke width based on zoom level
    }

    // Create zoom in and zoom out buttons
    const zoomInButton = d3.select("body").append("button")
        .text("Zoom In")
        .style("position", "absolute")
        .style("top", "60px")
        .style("left", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f5f5f5")
        .on("click", () => {
            svg.transition().call(zoom.scaleBy, 1.5); // Zoom in by 1.5x
        });

    const zoomOutButton = d3.select("body").append("button")
        .text("Zoom Out")
        .style("position", "absolute")
        .style("top", "100px")
        .style("left", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f5f5f5")
        .on("click", () => {
            svg.transition().call(zoom.scaleBy, 0.75); // Zoom out by 0.75x
        });
}
