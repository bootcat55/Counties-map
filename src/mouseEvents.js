import * as d3 from 'd3';
import { updateTooltip, hideTooltip, updateInfoPane, updateSliderPercentages } from './paneSetup.js';
import { updateVoteTotals, countyDataArray } from './voteUpdates.js';
import { resetCountyVotes, updateCountyColor } from './voteLogic.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export function setupMouseEvents(interactionLayer, tooltip, updatePane, sliders, buttons, svg, infoPane) {
    const { repSlider, demSlider, otherSlider } = sliders;
    const { submitButton, resetButton } = buttons;

    interactionLayer.selectAll("path")
        .on("mouseover", function (event, d) {
            updateTooltip(tooltip, d, event);
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
            hideTooltip(tooltip);
        })
        .on("click", function (event, d) {
            interactionLayer.selectAll("path").attr("stroke", "none").attr("stroke-width", 0);
            d3.select(this).attr("stroke", "white").attr("stroke-width", 2);

            const totalVotes = d.properties.Republican + d.properties.Democrat + d.properties.OtherVotes;
            const stateTotalPopulation = countyDataArray
                .filter(county => county.State === d.properties.State)
                .reduce((total, county) => total + county.Population, 0);
            const countyType = d.properties.vote_total > 50000 ? 'Urban' : 'Rural';

            updateInfoPane(infoPane, d.properties, stateTotalPopulation, countyType);
            updatePane.style("display", "block");

            // Set slider maximums and current values dynamically
            repSlider.attr("max", totalVotes).property("value", d.properties.Republican);
            demSlider.attr("max", totalVotes).property("value", d.properties.Democrat);
            otherSlider.attr("max", totalVotes).property("value", d.properties.OtherVotes);

            updateSliderPercentages(d.properties.Republican, d.properties.Democrat, d.properties.OtherVotes, totalVotes);

            const updateCountyVoteData = (changedSlider) => {
                let repVotes = +repSlider.property("value");
                let demVotes = +demSlider.property("value");
                let otherVotes = +otherSlider.property("value");
                let remainingVotes = totalVotes - otherVotes;

                if (changedSlider === 'repSlider') {
                    repVotes = Math.min(repVotes, remainingVotes);
                    demVotes = remainingVotes - repVotes;
                } else if (changedSlider === 'demSlider') {
                    demVotes = Math.min(demVotes, remainingVotes);
                    repVotes = remainingVotes - demVotes;
                } else if (changedSlider === 'otherSlider') {
                    remainingVotes = totalVotes - otherVotes;
                    repVotes = Math.min(repVotes, remainingVotes);
                    demVotes = remainingVotes - repVotes;
                }

                repSlider.property("value", repVotes);
                demSlider.property("value", demVotes);
                otherSlider.property("value", otherVotes);

                updateSliderPercentages(repVotes, demVotes, otherVotes, totalVotes);
                updateVoteTotals(d.properties, repVotes, demVotes, otherVotes);

                const selectedCountyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === d.properties.FIPS);
                updateCountyColor(selectedCountyPath, d.properties);
                updateInfoPane(infoPane, d.properties, stateTotalPopulation, countyType);

                recalculateAndDisplayPopularVote(countyDataArray);
            };

            repSlider.on("input", () => updateCountyVoteData('repSlider'));
            demSlider.on("input", () => updateCountyVoteData('demSlider'));
            otherSlider.on("input", () => updateCountyVoteData('otherSlider'));

            submitButton.on("click", function (e) {
                e.preventDefault();
                updateCountyVoteData(null);
                updatePane.style("display", "none");
            });

            resetButton.on("click", function (e) {
                e.preventDefault();
                resetCountyVotes(d.properties);

                const selectedCountyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === d.properties.FIPS);
                updateCountyColor(selectedCountyPath, d.properties);

                updateInfoPane(infoPane, d.properties, stateTotalPopulation, countyType);
                updatePane.style("display", "none");

                recalculateAndDisplayPopularVote(countyDataArray);
            });
        });
}
