import * as d3 from 'd3';
import { originalCountyDataArray, countyDataArray } from './voteUpdates.js';  // Import both arrays
import { stateElectoralVotes } from './electoralVotes.js';
import { voteMap } from './stateData.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import { updateStateColor } from './statemap.js';

// Calculate electoral votes per state based on county data
export function calculateElectoralVotes(data) {
    let republicanVotes = 0;
    let democratVotes = 0;
    let tooCloseToCallVotes = 0;

    const states = Array.from(new Set(data.map(d => d.State)));
    states.forEach(state => {
        const stateVotes = data.filter(d => d.State === state);
        const stateTotalRepublican = d3.sum(stateVotes, d => d.Republican);
        const stateTotalDemocrat = d3.sum(stateVotes, d => d.Democrat);
        
        if (stateTotalRepublican > stateTotalDemocrat) {
            republicanVotes += stateElectoralVotes[state];
        } else if (stateTotalDemocrat > stateTotalRepublican) {
            democratVotes += stateElectoralVotes[state];
        } else {
            tooCloseToCallVotes += stateElectoralVotes[state];
        }
    });

    return { republicanVotes, democratVotes, tooCloseToCallVotes };
}

// Calculate vote totals and percentages for a county
export function calculateCountyVotes(county) {
    county.vote_total = county.Republican + county.Democrat + county.OtherVotes;
    county.percentage_republican = county.vote_total ? (county.Republican / county.vote_total) * 100 : 0;
    county.percentage_democrat = county.vote_total ? (county.Democrat / county.vote_total) * 100 : 0;
    county.percentage_other = county.vote_total ? (county.OtherVotes / county.vote_total) * 100 : 0;
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
            countyDataArray[countyIndex] = { ...originalCounty }; // Restore original data
        }

        updateStateVotes(county.State); // Recalculate state-level votes

        // Update the state color and trigger events
        updateStateColor(county.State);
        window.dispatchEvent(new Event('stateColorChangedByVotes'));
        recalculateAndDisplayPopularVote(countyDataArray);
    }
}

// Utility to update state vote totals in voteMap
function updateStateVotes(state) {
    const stateCounties = countyDataArray.filter(c => c.State === state);
    const totalRepublican = d3.sum(stateCounties, c => c.Republican);
    const totalDemocrat = d3.sum(stateCounties, c => c.Democrat);
    const totalOther = d3.sum(stateCounties, c => c.OtherVotes);

    voteMap.set(state, { totalRepublican, totalDemocrat, totalOther });
}


