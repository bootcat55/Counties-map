import * as d3 from 'd3';
import { calculateCountyVotes } from './voteLogic.js';
import { voteMap } from './stateData.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import { updateCountyColor, resetCountyVotes } from './voteLogic.js'; // Import color update and reset functions

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

    // Update county in countyDataArray
    const countyIndex = countyDataArray.findIndex(c => c.FIPS === county.FIPS);
    if (countyIndex !== -1) {
        countyDataArray[countyIndex] = { ...county };
    }

    let updatedStateVotes = voteMap.get(county.State) || { totalRepublican: 0, totalDemocrat: 0, totalOther: 0 };

    updatedStateVotes.totalRepublican += county.Republican;
    updatedStateVotes.totalDemocrat += county.Democrat;
    updatedStateVotes.totalOther += county.OtherVotes;

    voteMap.set(county.State, updatedStateVotes);

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

    // Recalculate popular vote with updated countyDataArray
    recalculateAndDisplayPopularVote(countyDataArray);
}



