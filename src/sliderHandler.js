import * as d3 from 'd3';
import { updateVoteTotals, countyDataArray, resetCountyVotes } from './voteManager.js';
import { updateCountyColor } from './voteManager.js';
import { updateInfoPane } from './paneSetup.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export function setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg, aggregatedVotes, totalVotes) {
    const { repSlider, demSlider, otherSlider } = sliders;
    const { submitButton, resetButton } = buttons;

    const updateSliderPercentages = (repVotes, demVotes, otherVotes) => {
        const totalVotes = repVotes + demVotes + otherVotes;
        const repPercentage = ((repVotes / totalVotes) * 100).toFixed(1) || 0;
        const demPercentage = ((demVotes / totalVotes) * 100).toFixed(1) || 0;
        const otherPercentage = ((otherVotes / totalVotes) * 100).toFixed(1) || 0;

        d3.select("#repPercentage").text(`(${repPercentage}%)`);
        d3.select("#demPercentage").text(`(${demPercentage}%)`);
        d3.select("#otherPercentage").text(`(${otherPercentage}%)`);
    };

    const handleSliderInput = (changedSlider) => {
        let repVotes = +repSlider.property("value");
        let demVotes = +demSlider.property("value");
        let otherVotes = +otherSlider.property("value");

        const remainingPool = totalVotes - otherVotes;

        if (changedSlider === "repSlider") {
            demVotes = remainingPool - repVotes;
        } else if (changedSlider === "demSlider") {
            repVotes = remainingPool - demVotes;
        } else if (changedSlider === "otherSlider") {
            otherVotes = Math.max(0, Math.min(totalVotes, otherVotes));
        }

        // Enforce boundaries
        repVotes = Math.max(0, Math.min(remainingPool, repVotes));
        demVotes = Math.max(0, remainingPool - repVotes);

        // Update slider values
        repSlider.property("value", repVotes);
        demSlider.property("value", demVotes);
        otherSlider.property("value", otherVotes);

        updateSliderPercentages(repVotes, demVotes, otherVotes);

        // Update counties
        selectedCounties.forEach((county) => {
            updateVoteTotals(county, repVotes, demVotes, otherVotes);
            const countyPath = svg.selectAll("path.map-layer").filter((f) => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });

        recalculateAndDisplayPopularVote(countyDataArray);

        const firstCounty = selectedCounties[0];
        updateInfoPane(infoPane, {
            ...firstCounty,
            Republican: repVotes,
            Democrat: demVotes,
            OtherVotes: otherVotes,
        }, firstCounty.Population, firstCounty.vote_total > 50000 ? "Urban" : "Rural");
    };

    // Attach event listeners
    repSlider.on("input", () => handleSliderInput("repSlider"));
    demSlider.on("input", () => handleSliderInput("demSlider"));
    otherSlider.on("input", () => handleSliderInput("otherSlider"));

    submitButton.on("click", (e) => {
        e.preventDefault();
        updatePane.style("display", "none");
    });

    resetButton.on("click", (e) => {
        e.preventDefault();
        selectedCounties.forEach((county) => {
            resetCountyVotes(county);
            const countyPath = svg.selectAll("path.map-layer").filter((f) => f.properties.FIPS === county.FIPS);
            updateCountyColor(countyPath, county);
        });
        selectedCounties.length = 0;
        updatePane.style("display", "none");
        recalculateAndDisplayPopularVote(countyDataArray);
    });

    // Initialize sliders
    repSlider.attr("max", totalVotes).property("value", aggregatedVotes.Republican);
    demSlider.attr("max", totalVotes).property("value", aggregatedVotes.Democrat);
    otherSlider.attr("max", totalVotes).property("value", aggregatedVotes.OtherVotes);

    updateSliderPercentages(aggregatedVotes.Republican, aggregatedVotes.Democrat, aggregatedVotes.OtherVotes);
}
