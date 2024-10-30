import * as d3 from 'd3';

export function createInfoPane() {
    return d3.select("#info-container")
        .attr("class", "info-pane")
        .style("position", "absolute")
        .style("top", "700px")
        .style("right", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f9f9f9")
        .style("display", "none");
}

export function updateInfoPane(infoPane, county, stateTotalPopulation, countyType) {
    const republicanVotes = county.Republican || 0;
    const democratVotes = county.Democrat || 0;
    const otherVotes = county.OtherVotes || 0;
    const percentageRepublican = county.percentage_republican || 0;
    const percentageDemocrat = county.percentage_democrat || 0;
    const percentageOther = county.percentage_other || 0;

    infoPane.html(`
        County: ${county.County}, ${county.State}<br>
        Population: ${county.Population.toLocaleString()}<br>
        State Total Population: ${stateTotalPopulation.toLocaleString()}<br>
        
        Vote Turnout: ${county.turnout.toFixed(2)}%<br>
        
        Type: ${countyType}<br>
        <strong>Votes:</strong><br>
        - <span style="color: red;">Republican:</span> ${republicanVotes.toLocaleString()} (${percentageRepublican.toFixed(1)}%)<br>
        - <span style="color: blue;">Democrat:</span> ${democratVotes.toLocaleString()} (${percentageDemocrat.toFixed(1)}%)<br>
        - <span style="color: purple;">Other:</span> ${otherVotes.toLocaleString()} (${percentageOther.toFixed(1)}%)<br>
    `).style("display", "block");
}

export function createUpdatePane() {
    const updatePane = d3.select("#update-container")
        .attr("class", "update-pane")
        .style("position", "absolute")
        .style("bottom", "-600px")
        .style("right", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f0f0f0")
        .style("display", "none");

    const updateForm = updatePane.append("form")
        .style("display", "flex")
        .style("flex-direction", "column");  // Stack sliders vertically

    const createSlider = (labelText, id) => {
        updateForm.append("label").text(labelText);
        return updateForm.append("input")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", 100)
            .attr("value", 33)  // Initial equal distribution
            .attr("id", id)
            .style("width", "100%")  // Full width for consistent layout
            .style("margin", "5px 0");  // Vertical spacing for each slider
    };

    const repSlider = createSlider("Republican %:", "repSlider");
    const demSlider = createSlider("Democrat %:", "demSlider");
    const otherSlider = createSlider("Other %:", "otherSlider");

    const adjustSliders = (changedSlider) => {
        const total = +repSlider.property("value") + +demSlider.property("value") + +otherSlider.property("value");

        if (total !== 100) {
            const diff = total - 100;
            if (changedSlider === "repSlider") demSlider.property("value", +demSlider.property("value") - diff / 2);
            else if (changedSlider === "demSlider") repSlider.property("value", +repSlider.property("value") - diff / 2);
            else otherSlider.property("value", +otherSlider.property("value") - diff / 2);
        }

        updateCountyVoteData();
    };

    repSlider.on("input", () => adjustSliders("repSlider"));
    demSlider.on("input", () => adjustSliders("demSlider"));
    otherSlider.on("input", () => adjustSliders("otherSlider"));

    const submitButton = updateForm.append("button").text("Update Votes");
    const resetButton = updateForm.append("button").text("Reset County").style("margin-top", "10px");

    return { updatePane, repSlider, demSlider, otherSlider, submitButton, resetButton };
}

export function createTooltip() {
    return d3.select("#tooltip-container")
        .attr("class", "tooltip")
        .style("display", "none");
}

export function updateTooltip(tooltip, d, event) {
    const percentageRepublican = d.properties.percentage_republican || 0;
    const percentageDemocrat = d.properties.percentage_democrat || 0;
    const percentageOther = d.properties.percentage_other || 0;

    tooltip.style("display", "block")
        .html(`
            County: ${d.properties.County}, ${d.properties.State}<br>
            <strong><span style="color: red;">Republican:</span></strong> ${percentageRepublican.toFixed(1)}%<br>
            <strong><span style="color: blue;">Democrat:</span></strong> ${percentageDemocrat.toFixed(1)}%<br>
            <strong><span style="color: purple;">Other:</span></strong> ${percentageOther.toFixed(1)}%<br>
            <strong>Percentage Difference:</strong> ${Math.abs(percentageRepublican - percentageDemocrat).toFixed(1)}%
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
}

export function hideTooltip(tooltip) {
    tooltip.style("display", "none");
}

export function createResetAllButton() {
    return d3.select("body").append("button")
        .text("Reset All Counties")
        .style("position", "absolute")
        .style("top", "750px")
        .style("left", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f5f5f5");
}

