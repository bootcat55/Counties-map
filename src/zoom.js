import * as d3 from 'd3';

// No need to track zoom state or callbacks for stroke updates
// since stroke will scale automatically with vector-effect: null

export function createZoomControls(svg, width, height) {
    // Get or create the zoom group
    let zoomGroup = svg.select("g.zoom-group");
    if (zoomGroup.empty()) {
        zoomGroup = svg.append("g").attr("class", "zoom-group");
        
        // Move all existing paths into the zoom group
        svg.selectAll("path").each(function() {
            this.parentNode.appendChild(this);
        });
    }

    const zoom = d3.zoom()
        .scaleExtent([1, 50])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    svg.call(zoom);

    function zoomed(event) {
        const { transform } = event;
        zoomGroup.attr("transform", transform);
        // No need to update strokes - they scale automatically
    }

    const zoomControlsContainer = d3.select("#county-map")
        .append("div")
        .attr("class", "zoom-controls");

    zoomControlsContainer.append("button")
        .text("Zoom In")
        .attr("class", "zoom-button")
        .on("click", () => {
            svg.transition().duration(300).call(zoom.scaleBy, 1.5);
        });

    zoomControlsContainer.append("button")
        .text("Zoom Out")
        .attr("class", "zoom-button")
        .on("click", () => {
            svg.transition().duration(300).call(zoom.scaleBy, 0.75);
        });

    zoomControlsContainer.append("button")
        .text("Reset View")
        .attr("class", "zoom-button reset-button")
        .on("click", () => {
            svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
        });

    return zoom;
}

// Remove unnecessary exports - they're not needed anymore