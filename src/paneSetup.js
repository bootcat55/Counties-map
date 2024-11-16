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

export function updateInfoPane(infoPane, county, stateTotalPopulation, countyType, aggregatedVotes = null, totalVotes = null) {
    let republicanVotes, democratVotes, otherVotes, percentageRepublican, percentageDemocrat, percentageOther;

    if (aggregatedVotes && totalVotes) {
        republicanVotes = aggregatedVotes.Republican;
        democratVotes = aggregatedVotes.Democrat;
        otherVotes = aggregatedVotes.OtherVotes;

        percentageRepublican = ((republicanVotes / totalVotes) * 100).toFixed(1) || 0;
        percentageDemocrat = ((democratVotes / totalVotes) * 100).toFixed(1) || 0;
        percentageOther = ((otherVotes / totalVotes) * 100).toFixed(1) || 0;
    } else {
        republicanVotes = county.Republican || 0;
        democratVotes = county.Democrat || 0;
        otherVotes = county.OtherVotes || 0;

        percentageRepublican = (county.percentage_republican || 0).toFixed(1);
        percentageDemocrat = (county.percentage_democrat || 0).toFixed(1);
        percentageOther = (county.percentage_other || 0).toFixed(1);
    }

    infoPane.html(`
        County: ${county.County}, ${county.State}<br>
        Population: ${county.Population.toLocaleString()}<br>
        State Total Population: ${stateTotalPopulation.toLocaleString()}<br>
        
        Vote Turnout: ${(county.turnout || 0).toFixed(1)}%<br>
        
        Type: ${countyType}<br>
        <strong>Votes:</strong><br>
        - <span style="color: red;">Republican:</span> ${republicanVotes.toLocaleString()} (${percentageRepublican}%)<br>
        - <span style="color: blue;">Democrat:</span> ${democratVotes.toLocaleString()} (${percentageDemocrat}%)<br>
        - <span style="color: purple;">Other:</span> ${otherVotes.toLocaleString()} (${percentageOther}%)<br>
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
        .style("flex-direction", "column");

    updateForm.append("div").attr("id", "voting-info").style("margin-bottom", "10px");

    const createSlider = (labelText, id, percentageId, color) => {
        updateForm.append("label")
            .html(`<span style="font-weight: bold; color: ${color};">${labelText}</span> <span id="${percentageId}">(0%)</span>`);
        return updateForm.append("input")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", 100)
            .attr("value", 33)
            .attr("id", id)
            .style("width", "100%")
            .style("margin", "5px 0");
    };

    const repSlider = createSlider("Republican:", "repSlider", "repPercentage", "red");
    const demSlider = createSlider("Democrat:", "demSlider", "demPercentage", "blue");
    const otherSlider = createSlider("Other:", "otherSlider", "otherPercentage", "purple");

    const submitButton = updateForm.append("button").text("Update Votes");
    const resetButton = updateForm.append("button").text("Reset County").style("margin-top", "10px");

    return { updatePane, repSlider, demSlider, otherSlider, submitButton, resetButton };
}

export function createTooltip() {
    return d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "5px")
        .style("background-color", "#ffffff")
        .style("border", "1px solid #ccc")
        .style("pointer-events", "none")
        .style("display", "none");
}

export function updateTooltip(tooltip, d, event) {
    const totalVotes = d.properties.Republican + d.properties.Democrat + d.properties.OtherVotes;
    const percentageRepublican = ((d.properties.Republican / totalVotes) * 100).toFixed(1) || 0;
    const percentageDemocrat = ((d.properties.Democrat / totalVotes) * 100).toFixed(1) || 0;
    const percentageOther = ((d.properties.OtherVotes / totalVotes) * 100).toFixed(1) || 0;

    tooltip.html(`
        <strong>${d.properties.County}, ${d.properties.State}</strong><br>
        Population: ${d.properties.Population.toLocaleString()}<br>
        Vote Turnout: ${(d.properties.turnout || 0).toFixed(1)}%<br>
        Votes:<br>
        - <span style="color: red;">Republican:</span> ${d.properties.Republican.toLocaleString()} (${percentageRepublican}%)<br>
        - <span style="color: blue;">Democrat:</span> ${d.properties.Democrat.toLocaleString()} (${percentageDemocrat}%)<br>
        - <span style="color: purple;">Other:</span> ${d.properties.OtherVotes.toLocaleString()} (${percentageOther}%)
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 20) + "px")
    .style("display", "block");
}

export function hideTooltip(tooltip) {
    tooltip.style("display", "none");
}

export function createResetAllButton() {
    return d3.select("#reset-all-container")
        .append("button")
        .attr("id", "reset-all")
        .text("Reset All Counties")
        .style("margin-top", "10px");
}
