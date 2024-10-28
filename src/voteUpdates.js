import * as d3 from 'd3';
import { calculateCountyVotes } from './voteLogic.js';
import { voteMap, updateStateColor } from './statemap.js';
import { calculatePopularVote, displayPopularVote } from './popularVote.js';

// Function to update a county’s votes and map color
export function updateVoteTotals(county, newRepublicanVotes, newDemocratVotes, newOtherVotes) {
    // Ensure numeric values for updated votes
    county.Republican = +newRepublicanVotes || 0;
    county.Democrat = +newDemocratVotes || 0;
    county.OtherVotes = +newOtherVotes || 0;

    // Recalculate totals and percentages for the county
    calculateCountyVotes(county);

    // Update state-level vote totals in voteMap to reflect the county vote changes
    let updatedStateVotes = voteMap.get(county.State) || { totalRepublican: 0, totalDemocrat: 0, totalOther: 0 };

    // Adjust for previous county votes to prevent double-counting
    if (county.originalVotes) {
        updatedStateVotes.totalRepublican -= county.originalVotes.Republican || 0;
        updatedStateVotes.totalDemocrat -= county.originalVotes.Democrat || 0;
        updatedStateVotes.totalOther -= county.originalVotes.OtherVotes || 0;
    }

    // Add new county votes to the state total
    updatedStateVotes.totalRepublican += county.Republican;
    updatedStateVotes.totalDemocrat += county.Democrat;
    updatedStateVotes.totalOther += county.OtherVotes;

    // Save the updated votes as the county's new "original" vote totals
    county.originalVotes = {
        Republican: county.Republican,
        Democrat: county.Democrat,
        OtherVotes: county.OtherVotes
    };

    // Update the voteMap with the new state totals
    voteMap.set(county.State, updatedStateVotes);

    // Emit an event to notify the state map of the county vote update
    const event = new CustomEvent('countyVoteUpdated', {
        detail: {
            state: county.State,
            republicanVotes: county.Republican,
            democratVotes: county.Democrat,
            otherVotes: county.OtherVotes,
            fips: county.FIPS
        }
    });
    window.dispatchEvent(event);

    // Trigger the state color change event for the stacked bar chart to reflect changes
    window.dispatchEvent(new Event('stateColorChangedByVotes'));

    // Recalculate and display the popular vote with the latest data
    recalculateAndDisplayPopularVote(Array.from(voteMap.values()));
}

// Update the color of a county based on the latest percentages
export function updateCountyColor(path, county) {
    if (county.percentage_republican > county.percentage_democrat) {
        path.attr("fill", d3.interpolateReds(county.percentage_republican / 100));
    } else if (county.percentage_democrat > county.percentage_republican) {
        path.attr("fill", d3.interpolateBlues(county.percentage_democrat / 100));
    } else {
        path.attr("fill", county.vote_total === 0 ? "#ccc" : "purple");
    }
}

// Reset a county’s votes and update color
export function resetCountyVotes(county) {
    county.Republican = county.originalVotes.Republican;
    county.Democrat = county.originalVotes.Democrat;
    county.OtherVotes = county.originalVotes.OtherVotes;

    calculateCountyVotes(county);
    recalculateAndDisplayPopularVote(Array.from(voteMap.values()));
}

// Recalculate and display popular vote totals
function recalculateAndDisplayPopularVote(data) {
    console.log("Recalculating and displaying popular vote with data:", data);
    const popularVoteResults = calculatePopularVote(data);
    displayPopularVote(popularVoteResults);
}

