import * as d3 from 'd3';
import { calculateCountyVotes } from './voteLogic.js';
import { voteMap } from './stateData.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import { updateStateColor } from './statemap.js'; // Ensure this function is imported

// Define county data arrays
export let countyDataArray = [];  // Array to store current data per county
let originalCountyDataArray = []; // Array to store a backup of the original CSV data

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

// Reset a county’s votes to original and update color
export function resetCountyVotes(county) {
    const originalCounty = originalCountyDataArray.find(c => c.FIPS === county.FIPS);
    if (originalCounty) {
        county.Republican = originalCounty.Republican;
        county.Democrat = originalCounty.Democrat;
        county.OtherVotes = originalCounty.OtherVotes;

        calculateCountyVotes(county);

        const countyIndex = countyDataArray.findIndex(c => c.FIPS === county.FIPS);
        if (countyIndex !== -1) {
            countyDataArray[countyIndex] = { ...originalCounty };  // Restore original data
        }

        // Recalculate the total votes for the state
        const stateCounties = countyDataArray.filter(c => c.State === county.State);
        const totalRepublican = stateCounties.reduce((sum, c) => sum + c.Republican, 0);
        const totalDemocrat = stateCounties.reduce((sum, c) => sum + c.Democrat, 0);
        const totalOther = stateCounties.reduce((sum, c) => sum + c.OtherVotes, 0);

        // Update the state's totals in voteMap
        voteMap.set(county.State, {
            totalRepublican,
            totalDemocrat,
            totalOther
        });

        // Update the state color immediately
        updateStateColor(county.State);

        // Dispatch event to recalculate the stacked bar chart
        window.dispatchEvent(new Event('stateColorChangedByVotes'));

        recalculateAndDisplayPopularVote(countyDataArray);
    }
}


