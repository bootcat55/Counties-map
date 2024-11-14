import * as d3 from 'd3';
import { updateTooltip, hideTooltip, updateInfoPane, updateSliderPercentages } from './paneSetup.js';
import { updateVoteTotals, countyDataArray } from './voteUpdates.js';
import { resetCountyVotes, updateCountyColor } from './voteLogic.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

let selectedCounties = []; // Track selected counties

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
            const alreadySelected = selectedCounties.find(c => c.FIPS === d.properties.FIPS);
            if (alreadySelected) {
                selectedCounties = selectedCounties.filter(c => c.FIPS !== d.properties.FIPS);
                d3.select(this).attr("stroke", "none").attr("stroke-width", 0);
            } else {
                selectedCounties.push(d.properties);
                d3.select(this).attr("stroke", "white").attr("stroke-width", 2);
            }

            if (selectedCounties.length > 0) {
                updatePane.style("display", "block");

                const aggregatedVotes = selectedCounties.reduce((totals, county) => {
                    totals.Republican += county.Republican;
                    totals.Democrat += county.Democrat;
                    totals.OtherVotes += county.OtherVotes;
                    return totals;
                }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

                const totalVotes = aggregatedVotes.Republican + aggregatedVotes.Democrat + aggregatedVotes.OtherVotes;
                const otherFixed = aggregatedVotes.OtherVotes; // Fixed "Other Votes"
                const firstCounty = selectedCounties[0];

                // Update Info Pane with aggregated votes and metadata of the first county
                updateInfoPane(infoPane, {
                    ...firstCounty,
                    Republican: aggregatedVotes.Republican,
                    Democrat: aggregatedVotes.Democrat,
                    OtherVotes: otherFixed,
                }, firstCounty.Population, firstCounty.vote_total > 50000 ? "Urban" : "Rural");

                repSlider.attr("max", totalVotes - otherFixed).property("value", aggregatedVotes.Republican);
                demSlider.attr("max", totalVotes - otherFixed).property("value", aggregatedVotes.Democrat);
                otherSlider.attr("max", totalVotes).property("value", otherFixed);

                updateSliderPercentages(aggregatedVotes.Republican, aggregatedVotes.Democrat, otherFixed, totalVotes);

                const handleSliderInput = (changedSlider) => {
                    let repVotes = +repSlider.property("value");
                    let demVotes = +demSlider.property("value");
                    const remainingPool = totalVotes - otherFixed;

                    // Redistribute votes dynamically if any county maxes out
                    const redistributeVotes = (excess, targetSlider) => {
                        selectedCounties.forEach(county => {
                            const countyRemainingPool = county.vote_total - county.OtherVotes;
                            if (excess > 0) {
                                let adjustment = Math.min(excess, countyRemainingPool - county[targetSlider]);
                                county[targetSlider] += adjustment;
                                excess -= adjustment;
                            }
                        });
                    };

                    if (changedSlider !== "otherSlider") {
                        const swingTotal = repVotes + demVotes;

                        if (swingTotal !== remainingPool) {
                            const swingDiff = remainingPool - swingTotal;

                            if (changedSlider === "repSlider") {
                                demVotes += swingDiff;
                                if (demVotes < 0) redistributeVotes(-demVotes, "Democrat");
                            } else if (changedSlider === "demSlider") {
                                repVotes += swingDiff;
                                if (repVotes < 0) redistributeVotes(-repVotes, "Republican");
                            }

                            repVotes = Math.max(0, Math.min(remainingPool, repVotes));
                            demVotes = Math.max(0, remainingPool - repVotes);
                        }
                    } else {
                        otherFixed = +otherSlider.property("value");
                    }

                    repSlider.property("value", repVotes);
                    demSlider.property("value", demVotes);
                    updateSliderPercentages(repVotes, demVotes, otherFixed, totalVotes);

                    selectedCounties.forEach(county => {
                        const countyTotal = county.Republican + county.Democrat + county.OtherVotes;
                        const countyRemainingPool = countyTotal - county.OtherVotes;

                        let adjustedRepVotes = Math.round(county.Republican + (repVotes - aggregatedVotes.Republican) * (county.Republican / remainingPool));
                        let adjustedDemVotes = Math.round(county.Democrat + (demVotes - aggregatedVotes.Democrat) * (county.Democrat / remainingPool));
                        const adjustedOtherVotes = county.OtherVotes;

                        // Ensure no votes exceed the county's remaining pool
                        if (adjustedRepVotes + adjustedDemVotes > countyRemainingPool) {
                            const excess = adjustedRepVotes + adjustedDemVotes - countyRemainingPool;
                            adjustedDemVotes -= excess;
                        }

                        updateVoteTotals(
                            county,
                            Math.max(0, adjustedRepVotes),
                            Math.max(0, adjustedDemVotes),
                            adjustedOtherVotes // "Other Votes" remain unchanged
                        );

                        const countyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === county.FIPS);
                        updateCountyColor(countyPath, county);
                    });

                    recalculateAndDisplayPopularVote(countyDataArray);

                    aggregatedVotes.Republican = repVotes;
                    aggregatedVotes.Democrat = demVotes;

                    // Update Info Pane with the updated aggregated data
                    updateInfoPane(infoPane, {
                        ...firstCounty,
                        Republican: aggregatedVotes.Republican,
                        Democrat: aggregatedVotes.Democrat,
                        OtherVotes: otherFixed,
                    }, firstCounty.Population, firstCounty.vote_total > 50000 ? "Urban" : "Rural");
                };

                repSlider.on("input", () => handleSliderInput("repSlider"));
                demSlider.on("input", () => handleSliderInput("demSlider"));
                otherSlider.on("input", () => handleSliderInput("otherSlider"));

                submitButton.on("click", function (e) {
                    e.preventDefault();
                    updatePane.style("display", "none");
                });

                resetButton.on("click", function (e) {
                    e.preventDefault();
                    selectedCounties.forEach(county => {
                        resetCountyVotes(county);
                        const countyPath = svg.selectAll("path.map-layer").filter(f => f.properties.FIPS === county.FIPS);
                        updateCountyColor(countyPath, county);
                    });
                    selectedCounties = [];
                    updatePane.style("display", "none");
                    recalculateAndDisplayPopularVote(countyDataArray);
                });
            } else {
                updatePane.style("display", "none");
            }
        });
}
