import * as d3 from 'd3';
import { calculateCountyVotes } from './voteLogic.js';
import { voteMap } from './stateData.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

export let countyDataArray = [];  // Array to store current data per county
export let originalCountyDataArray = []; // Backup array for resetting to original values

// Initialize countyDataArray and backup the original data
export function initializeCountyDataArray(data) {
    originalCountyDataArray = data.map(county => ({ ...county }));  // Backup original data
    countyDataArray = data.map(county => ({ ...county }));          // Initialize working array
}

// Update vote totals for a county and ensure totals are valid
export function updateVoteTotals(county, newRepublicanVotes, newDemocratVotes, newOtherVotes) {
    const totalVotes = county.vote_total; // Fixed total vote pool
    const fixedOtherVotes = county.OtherVotes; // Preserve "Other Votes"

    // Adjust Republican and Democrat votes while respecting the fixed total
    let adjustedRepVotes = Math.max(0, Math.min(totalVotes - fixedOtherVotes, newRepublicanVotes || 0));
    let adjustedDemVotes = Math.max(0, totalVotes - fixedOtherVotes - adjustedRepVotes);

    // Update the county data
    county.Republican = adjustedRepVotes;
    county.Democrat = adjustedDemVotes;
    county.OtherVotes = fixedOtherVotes; // Keep "Other Votes" unchanged

    calculateCountyVotes(county);

    // Update the working array
    const countyIndex = countyDataArray.findIndex(c => c.FIPS === county.FIPS);
    if (countyIndex !== -1) {
        countyDataArray[countyIndex] = { ...county };
    }

    // Recalculate state-level totals
    updateStateVotes(county.State);

    // Dispatch events to update the map and vote display
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
    recalculateAndDisplayPopularVote(countyDataArray);
}

// Utility to update state vote totals in voteMap
function updateStateVotes(state) {
    const stateCounties = countyDataArray.filter(c => c.State === state);
    const totalRepublican = d3.sum(stateCounties, c => c.Republican);
    const totalDemocrat = d3.sum(stateCounties, c => c.Democrat);
    const totalOther = d3.sum(stateCounties, c => c.OtherVotes);

    voteMap.set(state, { totalRepublican, totalDemocrat, totalOther });
}
