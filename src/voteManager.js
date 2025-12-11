import * as d3 from 'd3';
import { stateElectoralVotes, stateElectoralVotes2024 } from './electoralVotes.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import { voteMap, stateColorToggle, stateLastUpdated, updateStateColor } from './statemap.js';

export let countyDataArray = [];
export let originalCountyDataArray = [];

// Track current census apportionment
let currentApportionment = '2010'; // '2010' or '2020'

// Initialize county data and backup the original data
export function initializeCountyDataArray(data) {
    originalCountyDataArray = data.map(county => ({ ...county })); // Backup original data
    countyDataArray = data.map(county => ({ ...county })); // Initialize working array
}

// Calculate vote totals and percentages for a county
export function calculateCountyVotes(county) {
    county.vote_total = county.Republican + county.Democrat + county.OtherVotes;
    county.percentage_republican = county.vote_total ? (county.Republican / county.vote_total) * 100 : 0;
    county.percentage_democrat = county.vote_total ? (county.Democrat / county.vote_total) * 100 : 0;
    county.percentage_other = county.vote_total ? (county.OtherVotes / county.vote_total) * 100 : 0;
    county.turnout = (county.vote_total / county.Population) * 100 || 0; // Turnout calculation
}

// Update vote totals for a county and ensure totals are valid
export function updateVoteTotals(county, newRepublicanVotes, newDemocratVotes, newOtherVotes) {
    const totalVotes = county.vote_total; // Fixed total vote pool
    const fixedOtherVotes = county.OtherVotes; // Preserve "Other Votes"

    // Ensure Republican and Democrat votes are symmetrical and respect the fixed total
    let adjustedRepVotes = Math.max(0, Math.min(totalVotes - fixedOtherVotes, newRepublicanVotes || 0));
    let adjustedDemVotes = Math.max(0, Math.min(totalVotes - fixedOtherVotes, newDemocratVotes || 0));

    // Ensure the sum of Republican and Democrat votes does not exceed the available votes
    const availableVotes = totalVotes - fixedOtherVotes;
    if (adjustedRepVotes + adjustedDemVotes > availableVotes) {
        // Scale down proportionally to fit within the available votes
        const scaleFactor = availableVotes / (adjustedRepVotes + adjustedDemVotes);
        adjustedRepVotes = Math.floor(adjustedRepVotes * scaleFactor);
        adjustedDemVotes = Math.floor(adjustedDemVotes * scaleFactor);
    }

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
            fips: county.FIPS,
        },
    });
    window.dispatchEvent(event);

    // Update popular vote and state map colors
    recalculateAndDisplayPopularVote(countyDataArray);
    updateStateColor(county.State);
}

// Reset a county's votes to original and update color
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

        // Deselect the county visually by removing the white border
        const svg = d3.select("#county-map").select("svg");
        const countyPath = svg.selectAll("path").filter(d => d.properties.FIPS === county.FIPS);
        countyPath.attr("stroke", "none").attr("stroke-width", 0);
    }
}

// Get the appropriate electoral vote map based on current apportionment
function getElectoralVotesMap() {
    return currentApportionment === '2010' ? stateElectoralVotes : stateElectoralVotes2024;
}

// Calculate electoral votes per state based on county data and current apportionment
export function calculateElectoralVotes(data) {
    let republicanVotes = 0;
    let democratVotes = 0;
    let tooCloseToCallVotes = 0;

    const electoralVotesMap = getElectoralVotesMap();
    const states = Array.from(new Set(data.map(d => d.State)));
    
    states.forEach(state => {
        const stateVotes = data.filter(d => d.State === state);
        const stateTotalRepublican = d3.sum(stateVotes, d => d.Republican);
        const stateTotalDemocrat = d3.sum(stateVotes, d => d.Democrat);
        const electoralVotes = electoralVotesMap[state] || 0;

        if (stateTotalRepublican > stateTotalDemocrat) {
            republicanVotes += electoralVotes;
        } else if (stateTotalDemocrat > stateTotalRepublican) {
            democratVotes += electoralVotes;
        } else {
            tooCloseToCallVotes += electoralVotes;
        }
    });

    return { 
        republicanVotes, 
        democratVotes, 
        tooCloseToCallVotes,
        apportionmentYear: currentApportionment
    };
}

// Update state-level vote totals
export function updateStateVotes(state) {
    const stateCounties = countyDataArray.filter(c => c.State === state);
    const totalRepublican = d3.sum(stateCounties, c => c.Republican);
    const totalDemocrat = d3.sum(stateCounties, c => c.Democrat);
    const totalOther = d3.sum(stateCounties, c => c.OtherVotes);

    voteMap.set(state, { totalRepublican, totalDemocrat, totalOther });
}

// Update the color of a county based on the latest percentages
export function updateCountyColor(path, county) {
    if (county.percentage_republican > county.percentage_democrat) {
        path.attr('fill', d3.interpolateReds(county.percentage_republican / 100));
    } else if (county.percentage_democrat > county.percentage_republican) {
        path.attr('fill', d3.interpolateBlues(county.percentage_democrat / 100));
    } else {
        path.attr('fill', county.vote_total === 0 ? '#ccc' : 'purple');
    }
}

// Set the current census apportionment and trigger updates
export function setApportionment(censusYear) {
    if (censusYear !== '2010' && censusYear !== '2020') {
        console.warn(`Invalid census year: ${censusYear}. Using '2010' as default.`);
        censusYear = '2010';
    }
    
    if (currentApportionment !== censusYear) {
        currentApportionment = censusYear;
        
        // Recalculate electoral votes with new apportionment
        const electoralResults = calculateElectoralVotes(countyDataArray);
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('electoralVotesRecalculated', {
            detail: {
                ...electoralResults,
                censusYear: currentApportionment
            }
        }));
        
        console.log(`Apportionment updated to ${currentApportionment} Census`);
    }
}

// Get the current apportionment setting
export function getCurrentApportionment() {
    return currentApportionment;
}

// Recalculate electoral votes with current data and apportionment
export function recalculateElectoralVotes() {
    return calculateElectoralVotes(countyDataArray);
}

// Listen for apportionment changes from the state map dropdown
window.addEventListener('apportionmentChanged', function(e) {
    const censusYear = e.detail.censusYear;
    setApportionment(censusYear);
});

// Initialize with default apportionment
setApportionment('2010');