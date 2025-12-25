import * as d3 from 'd3';
import { updateTooltip, hideTooltip, updateInfoPane } from './paneSetup.js';
import { countyDataArray } from './voteManager.js';
import { setupSliders } from './sliderHandler.js';
import { setSelectedCounty } from './geoMap.js';

// Export selectedCounties array
export let selectedCounties = [];

export function setupMouseEvents(interactionLayer, tooltip, updatePane, sliders, buttons, svg, infoPane, projection, geoData) {
    const dropdown = document.getElementById('data-year-selector');

    interactionLayer.selectAll("path")
        .on("mouseover", function (event, d) {
            if (dropdown && dropdown.classList.contains("open")) {
                hideTooltip(tooltip);
                return;
            }
            updateTooltip(tooltip, d, event);
        })
        .on("mousemove", function (event) {
            if (dropdown && dropdown.classList.contains("open")) {
                hideTooltip(tooltip);
                return;
            }
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
            hideTooltip(tooltip);
        })
        .on("click", function (event, d) {
            event.stopPropagation();
            
            // Set the selected county for satellite toggle FIRST
            setSelectedCounty(d, svg);
            
            const alreadySelected = selectedCounties.find(c => c.FIPS === d.properties.FIPS);
            if (alreadySelected) {
                selectedCounties = selectedCounties.filter(c => c.FIPS !== d.properties.FIPS);
                d3.select(this)
                    .attr("stroke", "none")
                    .attr("stroke-width", 0)
                    .attr("vector-effect", null);
                
                // If deselecting the last county, clear satellite selection
                if (selectedCounties.length === 0) {
                    setSelectedCounty(null, svg);
                }
            } else {
                selectedCounties.push(d.properties);
                
                // Use non-scaling stroke to stay in screen pixels
                d3.select(this)
                    .attr("stroke", "white")
                    .attr("stroke-width", 1) // Start at 1px
                    .attr("stroke-opacity", 0.9)
                    .attr("vector-effect", "non-scaling-stroke"); // Critical!
                
                // Store original votes for bar chart comparison if not already stored
                if (!d.properties.originalVotes) {
                    d.properties.originalVotes = {
                        Republican: d.properties.Republican,
                        Democrat: d.properties.Democrat,
                        OtherVotes: d.properties.OtherVotes
                    };
                }
            }

            console.log("Number of selected counties:", selectedCounties.length);

            if (selectedCounties.length > 0) {
                updatePane.style("display", "block");

                // Aggregate votes for selected counties
                const aggregatedVotes = selectedCounties.reduce((totals, county) => {
                    totals.Republican += county.Republican;
                    totals.Democrat += county.Democrat;
                    totals.OtherVotes += county.OtherVotes;
                    return totals;
                }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

                const totalVotes = aggregatedVotes.Republican + aggregatedVotes.Democrat + aggregatedVotes.OtherVotes;
                const firstCounty = selectedCounties[0];

                // Calculate the total population of all counties in the same state as the first county
                const stateTotalPopulation = countyDataArray
                    .filter(county => county.State === firstCounty.State)
                    .reduce((sum, county) => sum + county.Population, 0);

                // Update Info Pane with aggregated votes and metadata
                updateInfoPane(infoPane, {
                    counties: selectedCounties,
                    aggregatedVotes,
                    totalVotes,
                    stateTotalPopulation,
                    countyType: firstCounty.vote_total > 50000 ? "Urban" : "Rural",
                });

                // Delegate slider handling to sliderHandler.js
                setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg, aggregatedVotes, totalVotes);
            } else {
                updatePane.style("display", "none");
            }
        })
        .on("dblclick", function (event, d) {
            event.stopPropagation();
            
            // Set satellite view to the clicked county FIRST
            setSelectedCounty(d, svg);
            
            const stateAbbreviation = d.properties.State; // Get the state abbreviation
            const stateCounties = countyDataArray.filter(county => county.State === stateAbbreviation);

            // Check if all counties in the state are already selected
            const allSelected = stateCounties.every(county => 
                selectedCounties.some(selected => selected.FIPS === county.FIPS)
            );

            if (allSelected) {
                // Deselect all counties in the state
                selectedCounties = selectedCounties.filter(
                    selected => !stateCounties.some(county => county.FIPS === selected.FIPS)
                );
                
                // Update visual selection for all deselected counties
                stateCounties.forEach(county => {
                    const countyPath = svg.selectAll("path.interaction-layer")
                        .filter(d => d.properties.FIPS === county.FIPS);
                    countyPath.attr("stroke", "none")
                        .attr("stroke-width", 0)
                        .attr("vector-effect", null);
                });
                
                // Clear satellite selection since all counties are deselected
                setSelectedCounty(null, svg);
            } else {
                // Select all counties in the state
                stateCounties.forEach(county => {
                    if (!selectedCounties.some(selected => selected.FIPS === county.FIPS)) {
                        selectedCounties.push(county);
                        
                        // Store original votes if not already stored
                        if (!county.originalVotes) {
                            county.originalVotes = {
                                Republican: county.Republican,
                                Democrat: county.Democrat,
                                OtherVotes: county.OtherVotes
                            };
                        }
                    }
                });
                
                // Update visual selection for all selected counties
                stateCounties.forEach(county => {
                    const countyPath = svg.selectAll("path.interaction-layer")
                        .filter(d => d.properties.FIPS === county.FIPS);
                    countyPath.attr("stroke", "white")
                        .attr("stroke-width", 1) // Start at 1px
                        .attr("stroke-opacity", 0.9)
                        .attr("vector-effect", "non-scaling-stroke"); // Critical!
                });
            }

            // Update the info pane
            if (selectedCounties.length > 0) {
                // Aggregate votes for selected counties
                const aggregatedVotes = selectedCounties.reduce((totals, county) => {
                    totals.Republican += county.Republican;
                    totals.Democrat += county.Democrat;
                    totals.OtherVotes += county.OtherVotes;
                    return totals;
                }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

                const totalVotes = aggregatedVotes.Republican + aggregatedVotes.Democrat + aggregatedVotes.OtherVotes;
                const firstCounty = selectedCounties[0];

                // Calculate the total population of all counties in the same state as the first county
                const stateTotalPopulation = countyDataArray
                    .filter(county => county.State === firstCounty.State)
                    .reduce((sum, county) => sum + county.Population, 0);

                updateInfoPane(infoPane, {
                    counties: selectedCounties,
                    aggregatedVotes,
                    totalVotes,
                    stateTotalPopulation,
                    countyType: firstCounty.vote_total > 50000 ? "Urban" : "Rural",
                });

                // Update sliders
                setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg, aggregatedVotes, totalVotes);
            } else {
                updatePane.style("display", "none");
            }
        });
}

// Function to update county selection on the map
function updateCountySelection(svg, counties, isSelected) {
    counties.forEach(county => {
        const countyPath = svg.selectAll("path.interaction-layer").filter(d => d.properties.FIPS === county.FIPS);
        if (isSelected) {
            countyPath.attr("stroke", "white")
                .attr("stroke-width", 1)
                .attr("stroke-opacity", 0.9)
                .attr("vector-effect", "non-scaling-stroke");
        } else {
            countyPath.attr("stroke", "none")
                .attr("stroke-width", 0)
                .attr("vector-effect", null);
        }
    });
}

// Function to update the info pane with selected counties
function updateInfoPaneWithSelectedCounties(counties, isSelected) {
    const infoPane = d3.select("#info-container");
    if (isSelected) {
        const aggregatedVotes = counties.reduce((totals, county) => {
            totals.Republican += county.Republican;
            totals.Democrat += county.Democrat;
            totals.OtherVotes += county.OtherVotes;
            return totals;
        }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

        const totalVotes = aggregatedVotes.Republican + aggregatedVotes.Democrat + aggregatedVotes.OtherVotes;
        const firstCounty = counties[0];

        // Calculate the total population of all counties in the same state as the first county
        const stateTotalPopulation = countyDataArray
            .filter(county => county.State === firstCounty.State)
            .reduce((sum, county) => sum + county.Population, 0);

        // Update the info pane with aggregated data
        updateInfoPane(infoPane, {
            counties,
            aggregatedVotes,
            totalVotes,
            stateTotalPopulation,
            countyType: firstCounty.vote_total > 50000 ? "Urban" : "Rural",
        });
    } else {
        infoPane.style("display", "none");
    }
}

export function countSelectedCounties() {
    return selectedCounties.length;
}

// Function to clear all selections
export function clearAllSelections(svg) {
    // Clear visual selections
    svg.selectAll("path.interaction-layer")
        .attr("stroke", "none")
        .attr("stroke-width", 0)
        .attr("vector-effect", null);
    
    // Clear selected counties array
    selectedCounties = [];
    
    // Hide update pane
    d3.select("#update-container").style("display", "none");
    
    // Clear info pane
    d3.select("#info-container").style("display", "none");
}

// Function to get currently selected county for satellite view
export function getSelectedCountyForSatellite() {
    // Return the last selected county (most relevant for satellite view)
    return selectedCounties.length > 0 ? selectedCounties[selectedCounties.length - 1] : null;
}