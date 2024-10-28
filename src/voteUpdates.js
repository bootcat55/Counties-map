import * as d3 from 'd3';
import { calculateCountyVotes } from './voteLogic.js';
import { voteMap } from './stateData.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';

// Define and export countyDataArray
export let countyDataArray = [];  // Array to store updated data per county

// Initialize countyDataArray by loading data from the CSV
export function initializeCountyDataArray(data) {
    countyDataArray = data.map(county => ({ ...county }));  // Create a copy of data
    console.log("countyDataArray initialized:", countyDataArray);
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

    if (county.originalVotes) {
        updatedStateVotes.totalRepublican -= county.originalVotes.Republican || 0;
        updatedStateVotes.totalDemocrat -= county.originalVotes.Democrat || 0;
        updatedStateVotes.totalOther -= county.originalVotes.OtherVotes || 0;
    }

    updatedStateVotes.totalRepublican += county.Republican;
    updatedStateVotes.totalDemocrat += county.Democrat;
    updatedStateVotes.totalOther += county.OtherVotes;

    county.originalVotes = {
        Republican: county.Republican,
        Democrat: county.Democrat,
        OtherVotes: county.OtherVotes
    };

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
    county.Republican = county.originalVotes.Republican;
    county.Democrat = county.originalVotes.Democrat;
    county.OtherVotes = county.originalVotes.OtherVotes;

    calculateCountyVotes(county);

    const countyIndex = countyDataArray.findIndex(c => c.FIPS === county.FIPS);
    if (countyIndex !== -1) {
        countyDataArray[countyIndex] = { ...county };
    }

    // Recalculate popular vote with reset countyDataArray
    recalculateAndDisplayPopularVote(countyDataArray);
}
