import * as d3 from 'd3';
import { updateVoteTotals, countyDataArray, resetCountyVotes, updateCountyColor, calculateCountyVotes } from './voteManager.js';
import { updateInfoPane } from './paneSetup.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export function setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg, aggregatedVotes, totalVotes) {
    const { repSlider, demSlider, otherSlider } = sliders;
    const { submitButton, resetButton } = buttons;

    const updateSliderPercentages = () => {
        const totalVotes = selectedCounties.reduce((totals, county) => {
            totals.Republican += county.Republican;
            totals.Democrat += county.Democrat;
            totals.OtherVotes += county.OtherVotes;
            return totals;
        }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

        const total = totalVotes.Republican + totalVotes.Democrat + totalVotes.OtherVotes;
        const repPercentage = ((totalVotes.Republican / total) * 100).toFixed(2) || 0;
        const demPercentage = ((totalVotes.Democrat / total) * 100).toFixed(2) || 0;
        const otherPercentage = ((totalVotes.OtherVotes / total) * 100).toFixed(2) || 0;

        d3.select("#repPercentage").text(`(${repPercentage}%)`);
        d3.select("#demPercentage").text(`(${demPercentage}%)`);
        d3.select("#otherPercentage").text(`(${otherPercentage}%)`);

        repSlider.property("value", Math.round(repPercentage));
        demSlider.property("value", Math.round(demPercentage));
        otherSlider.property("value", Math.round(otherPercentage));
    };

    const calculateSwing = (newPercentage, originalPercentage) => newPercentage - originalPercentage;

    const applySwingToCounty = (county, swingPercentage) => {
        const totalVotes = county.Republican + county.Democrat + county.OtherVotes;
        county.Republican = Math.max(0, Math.round(county.Republican * (1 + swingPercentage / 100)));
        county.Democrat = Math.max(0, Math.round(county.Democrat * (1 - swingPercentage / 100)));
        county.OtherVotes = Math.max(0, totalVotes - county.Republican - county.Democrat);
        calculateCountyVotes(county);
    };

    const updateInfoPaneWithTotalVotes = () => {
        const totalVotes = selectedCounties.reduce((totals, county) => {
            totals.Republican += county.Republican;
            totals.Democrat += county.Democrat;
            totals.OtherVotes += county.OtherVotes;
            return totals;
        }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

        const totalPopulation = selectedCounties.reduce((sum, county) => sum + county.Population, 0);

        updateInfoPane(infoPane, {
            County: "Selected Counties",
            State: "",
            Republican: totalVotes.Republican,
            Democrat: totalVotes.Democrat,
            OtherVotes: totalVotes.OtherVotes,
            Population: totalPopulation,
        }, totalPopulation, "");
    };

    let previousSliderValues = { rep: 50, dem: 50, other: 0 }; // Initial percentages

    const handleSliderInput = () => {
        let repPercentage = +repSlider.property("value");
        let demPercentage = +demSlider.property("value");
        let otherPercentage = +otherSlider.property("value");

        const totalSliderPercentage = repPercentage + demPercentage + otherPercentage;
        const normalizedRepPercentage = (repPercentage / totalSliderPercentage) * 100;
        const swingPercentage = calculateSwing(normalizedRepPercentage, previousSliderValues.rep);

        selectedCounties.forEach((county) => {
            applySwingToCounty(county, swingPercentage);
            const countyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });

        previousSliderValues.rep = normalizedRepPercentage;
        recalculateAndDisplayPopularVote(countyDataArray);

        updateInfoPaneWithTotalVotes();
        updateSliderPercentages();
    };

    repSlider.attr("max", 100).attr("step", 1).property("value", 50).style("cursor", "pointer");
    demSlider.attr("max", 100).attr("step", 1).property("value", 50).style("cursor", "pointer");
    otherSlider.attr("max", 100).attr("step", 1).property("value", 0).style("cursor", "pointer");

    repSlider.on("input", () => handleSliderInput());
    demSlider.on("input", () => handleSliderInput());
    otherSlider.on("input", () => handleSliderInput());

    submitButton.on("click", (e) => {
        e.preventDefault();
        updatePane.style("display", "none");
    });

    resetButton.on("click", (e) => {
        e.preventDefault();
        selectedCounties.forEach((county) => {
            resetCountyVotes(county);
            const countyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });
        selectedCounties.length = 0;
        updatePane.style("display", "none");
        recalculateAndDisplayPopularVote(countyDataArray);
    });

    updateSliderPercentages();
    updateInfoPaneWithTotalVotes();
}

export function resetAllSliders(sliders, aggregatedVotes, totalVotes) {
    const { repSlider, demSlider, otherSlider } = sliders;

    repSlider.attr("max", 100).attr("step", 5).property("value", 50).style("cursor", "pointer");
    demSlider.attr("max", 100).attr("step", 5).property("value", 50).style("cursor", "pointer");
    otherSlider.attr("max", 100).attr("step", 5).property("value", 0).style("cursor", "pointer");

    const total = aggregatedVotes.Republican + aggregatedVotes.Democrat + aggregatedVotes.OtherVotes;
    const repPercentage = ((aggregatedVotes.Republican / total) * 100).toFixed(2) || 0;
    const demPercentage = ((aggregatedVotes.Democrat / total) * 100).toFixed(2) || 0;
    const otherPercentage = ((aggregatedVotes.OtherVotes / total) * 100).toFixed(2) || 0;

    d3.select("#repPercentage").text(`(${repPercentage}%)`);
    d3.select("#demPercentage").text(`(${demPercentage}%)`);
    d3.select("#otherPercentage").text(`(${otherPercentage}%)`);
}
