import * as d3 from 'd3';
import { calculateCountyVotes } from './voteLogic.js';
import { voteMap } from './stateData.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import { resetCountyVotes, updateCountyColor } from './voteLogic.js';
export let countyDataArray = [];  // Array to store current data per county
export let originalCountyDataArray = []; // Export this array for access in voteLogic.js

// Initialize countyDataArray and backup the original data
export function initializeCountyDataArray(data) {
    originalCountyDataArray = data.map(county => ({ ...county }));  // Backup the original CSV data
    countyDataArray = data.map(county => ({ ...county }));          // Initialize working data array
}

// Update vote totals for a county and recalculate popular vote with updated data
export function updateVoteTotals(county, newRepublicanVotes, newDemocratVotes, newOtherVotes) {
    county.Republican = +newRepublicanVotes || 0;
    county.Democrat = +newDemocratVotes || 0;
    county.OtherVotes = +newOtherVotes || 0;

    calculateCountyVotes(county);

    const countyIndex = countyDataArray.findIndex(c => c.FIPS === county.FIPS);
    if (countyIndex !== -1) {
        countyDataArray[countyIndex] = { ...county };
    }

    updateStateVotes(county.State); // Recalculate state-level votes

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
    window.dispatchEvent(new Event('stateColorChangedByVotes'));

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



