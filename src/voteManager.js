import * as d3 from 'd3';
import { stateElectoralVotes } from './electoralVotes.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import { updateStateColor } from './statemap.js';
import { voteMap } from './stateData.js';

// Constants
const PERCENTAGE_FACTOR = 100;

// Data arrays
export let countyDataArray = [];
export let originalCountyDataArray = [];

// Initialize county data and backup the original data
export function initializeCountyDataArray(data) {
    originalCountyDataArray = data.map(county => ({ ...county })); // Backup original data
    countyDataArray = data.map(county => ({ ...county })); // Initialize working array
}

// Calculate vote totals and percentages for a county
export function calculateCountyVotes(county) {
    county.vote_total = county.Republican + county.Democrat + county.OtherVotes;
    county.percentage_republican = county.vote_total ? (county.Republican / county.vote_total) * PERCENTAGE_FACTOR : 0;
    county.percentage_democrat = county.vote_total ? (county.Democrat / county.vote_total) * PERCENTAGE_FACTOR : 0;
    county.percentage_other = county.vote_total ? (county.OtherVotes / county.vote_total) * PERCENTAGE_FACTOR : 0;
    county.turnout = (county.vote_total / county.Population) * PERCENTAGE_FACTOR || 0; // Turnout calculation
}

// Adjust votes while respecting the fixed total
const adjustVotes = (county, newRepublicanVotes, newDemocratVotes) => {
    const totalVotes = county.vote_total; // Fixed total vote pool
    const fixedOtherVotes = county.OtherVotes; // Preserve "Other Votes"

    // Adjust Republican and Democrat votes while respecting the fixed total
    let adjustedRepVotes = Math.max(0, Math.min(totalVotes - fixedOtherVotes, newRepublicanVotes || 0));
    let adjustedDemVotes = Math.max(0, totalVotes - fixedOtherVotes - adjustedRepVotes);

    return { adjustedRepVotes, adjustedDemVotes, fixedOtherVotes };
};

// Update county data in the working array
const updateCountyData = (county) => {
    const countyIndex = countyDataArray.findIndex(countyData => countyData.FIPS === county.FIPS);
    if (countyIndex !== -1) {
        countyDataArray[countyIndex] = { ...county };
    }
};

// Trigger events to update the UI
const triggerUpdateEvents = (county) => {
    const event = new CustomEvent('countyVoteUpdated', {
        detail: {
            state: county.State,
            republicanVotes: county.Republican,
            democratVotes: county.Democrat,
            otherVotes: county.OtherVotes,
            fips: county.FIPS,
        },
    });
    window.dispatchEvent(event);
    recalculateAndDisplayPopularVote(countyDataArray);
};

// Update vote totals for a county and ensure totals are valid
export function updateVoteTotals(county, newRepublicanVotes, newDemocratVotes, newOtherVotes) {
    const { adjustedRepVotes, adjustedDemVotes, fixedOtherVotes } = adjustVotes(county, newRepublicanVotes, newDemocratVotes);

    // Update the county data
    county.Republican = adjustedRepVotes;
    county.Democrat = adjustedDemVotes;
    county.OtherVotes = fixedOtherVotes; // Keep "Other Votes" unchanged

    calculateCountyVotes(county);
    updateCountyData(county);
    updateStateVotes(county.State);
    triggerUpdateEvents(county);
}

// Reset a county’s votes to original and update color
export function resetCountyVotes(county) {
    const originalCounty = originalCountyDataArray.find(countyData => countyData.FIPS === county.FIPS);
    if (originalCounty) {
        county.Republican = originalCounty.Republican;
        county.Democrat = originalCounty.Democrat;
        county.OtherVotes = originalCounty.OtherVotes;

        calculateCountyVotes(county);
        updateCountyData(county);
        updateStateVotes(county.State);

        // Update the state color and trigger events
        updateStateColor(county.State);
        window.dispatchEvent(new Event('stateColorChangedByVotes'));
        recalculateAndDisplayPopularVote(countyDataArray);
    }
}

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

// Update state-level vote totals
export function updateStateVotes(state) {
    const stateCounties = countyDataArray.filter(county => county.State === state);
    const totalRepublican = d3.sum(stateCounties, county => county.Republican);
    const totalDemocrat = d3.sum(stateCounties, county => county.Democrat);
    const totalOther = d3.sum(stateCounties, county => county.OtherVotes);

    voteMap.set(state, { totalRepublican, totalDemocrat, totalOther });
}

// Update the color of a county based on the latest percentages
export function updateCountyColor(path, county) {
    if (county.percentage_republican > county.percentage_democrat) {
        path.attr('fill', d3.interpolateReds(county.percentage_republican / PERCENTAGE_FACTOR));
    } else if (county.percentage_democrat > county.percentage_republican) {
        path.attr('fill', d3.interpolateBlues(county.percentage_democrat / PERCENTAGE_FACTOR));
    } else {
        path.attr('fill', county.vote_total === 0 ? '#ccc' : 'purple');
    }
}