import * as d3 from 'd3';

export function createZoomControls(svg, width, height) {
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    svg.call(zoom);

    function zoomed(event) {
        const { transform } = event;
        svg.selectAll('path')
            .attr('transform', transform)
            .attr('stroke-width', 1 / transform.k);
    }

    const zoomControlsContainer = d3.select("#county-map")
        .append("div")
        .attr("class", "zoom-controls");

    zoomControlsContainer.append("button")
        .text("Zoom In")
        .attr("class", "zoom-button")
        .on("click", () => {
            svg.transition().call(zoom.scaleBy, 1.5);
        });

    zoomControlsContainer.append("button")
        .text("Zoom Out")
        .attr("class", "zoom-button")
        .on("click", () => {
            svg.transition().call(zoom.scaleBy, 0.75);
        });
}

