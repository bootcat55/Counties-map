import * as d3 from 'd3';

// Helper function to calculate vote percentages
const calculateVotePercentages = (republicanVotes, democratVotes, otherVotes) => {
    const totalVotes = republicanVotes + democratVotes + otherVotes;
    return {
        republican: ((republicanVotes / totalVotes) * 100).toFixed(1) || 0,
        democrat: ((democratVotes / totalVotes) * 100).toFixed(1) || 0,
        other: ((otherVotes / totalVotes) * 100).toFixed(1) || 0,
    };
};

// Helper function to generate info pane content
const generateInfoPaneContent = (county, stateTotalPopulation, countyType, percentages) => `
    County: ${county.County}, ${county.State}<br>
    Population: ${county.Population.toLocaleString()}<br>
    State Total Population: ${stateTotalPopulation.toLocaleString()}<br>
    Vote Turnout: ${(county.turnout || 0).toFixed(1)}%<br>
    Type: ${countyType}<br>
    <strong>Votes:</strong><br>
    - <span style="color: red;">Republican:</span> ${county.Republican.toLocaleString()} (${percentages.republican}%)<br>
    - <span style="color: blue;">Democrat:</span> ${county.Democrat.toLocaleString()} (${percentages.democrat}%)<br>
    - <span style="color: purple;">Other:</span> ${county.OtherVotes.toLocaleString()} (${percentages.other}%)<br>
`;

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
    let republicanVotes, democratVotes, otherVotes, percentages;

    if (aggregatedVotes && totalVotes) {
        republicanVotes = aggregatedVotes.Republican;
        democratVotes = aggregatedVotes.Democrat;
        otherVotes = aggregatedVotes.OtherVotes;
    } else {
        republicanVotes = county.Republican || 0;
        democratVotes = county.Democrat || 0;
        otherVotes = county.OtherVotes || 0;
    }

    percentages = calculateVotePercentages(republicanVotes, democratVotes, otherVotes);
    infoPane.html(generateInfoPaneContent(county, stateTotalPopulation, countyType, percentages))
        .style("display", "block");
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

export function updateTooltip(tooltip, countyData, event) {
    const totalVotes = countyData.properties.Republican + countyData.properties.Democrat + countyData.properties.OtherVotes;
    const percentages = calculateVotePercentages(
        countyData.properties.Republican,
        countyData.properties.Democrat,
        countyData.properties.OtherVotes
    );

    tooltip.html(`
        <strong>${countyData.properties.County}, ${countyData.properties.State}</strong><br>
        Population: ${countyData.properties.Population.toLocaleString()}<br>
        Vote Turnout: ${(countyData.properties.turnout || 0).toFixed(1)}%<br>
        Votes:<br>
        - <span style="color: red;">Republican:</span> ${countyData.properties.Republican.toLocaleString()} (${percentages.republican}%)<br>
        - <span style="color: blue;">Democrat:</span> ${countyData.properties.Democrat.toLocaleString()} (${percentages.democrat}%)<br>
        - <span style="color: purple;">Other:</span> ${countyData.properties.OtherVotes.toLocaleString()} (${percentages.other}%)
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 20) + "px")
    .style("display", "block");
}

export function hideTooltip(tooltip) {
    tooltip.style("display", "none");
}

export function createResetAllButton() {
    let existingButton = d3.select("#reset-all");
    if (!existingButton.empty()) {
        return existingButton;
    }

    return d3.select("#reset-all-container")
        .append("button")
        .attr("id", "reset-all")
        .text("Reset All Counties")
        .style("margin-top", "10px");
}