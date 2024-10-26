import * as d3 from 'd3';

export const stateElectoralVotes = {
    'AL': 9, 'AK': 3, 'AZ': 11, 'AR': 6, 'CA': 55, 'CO': 9, 'CT': 7,
    'DE': 3, 'FL': 29, 'GA': 16, 'HI': 4, 'ID': 4, 'IL': 20, 'IN': 11,
    'IA': 6, 'KS': 6, 'KY': 8, 'LA': 8, 'ME': 4, 'MD': 10, 'MA': 11,
    'MI': 16, 'MN': 10, 'MS': 6, 'MO': 10, 'MT': 3, 'NE': 5, 'NV': 6,
    'NH': 4, 'NJ': 14, 'NM': 5, 'NY': 29, 'NC': 15, 'ND': 3, 'OH': 18,
    'OK': 7, 'OR': 7, 'PA': 20, 'RI': 4, 'SC': 9, 'SD': 3, 'TN': 11,
    'TX': 38, 'UT': 6, 'VT': 3, 'VA': 13, 'WA': 12, 'WV': 5, 'WI': 10, 
    'WY': 3, 'DC': 3
};

export const stateElectoralVotes2024 = {
    'AL': 9, 'AK': 3, 'AZ': 11, 'AR': 6, 'CA': 54, 'CO': 10, 'CT': 7,
    'DE': 3, 'FL': 30, 'GA': 16, 'HI': 4, 'ID': 4, 'IL': 19, 'IN': 11,
    'IA': 6, 'KS': 6, 'KY': 8, 'LA': 8, 'ME': 4, 'MD': 10, 'MA': 11,
    'MI': 15, 'MN': 10, 'MS': 6, 'MO': 10, 'MT': 4, 'NE': 5, 'NV': 6,
    'NH': 4, 'NJ': 14, 'NM': 5, 'NY': 28, 'NC': 16, 'ND': 3, 'OH': 17,
    'OK': 7, 'OR': 8, 'PA': 19, 'RI': 4, 'SC': 9, 'SD': 3, 'TN': 11,
    'TX': 40, 'UT': 6, 'VT': 3, 'VA': 13, 'WA': 12, 'WV': 4, 'WI': 10, 
    'WY': 3, 'DC': 3
};

// Function to calculate electoral votes per party
export function calculateElectoralVotes(data) {
    let republicanVotes = 0;
    let democratVotes = 0;
    let tooCloseToCallVotes = 0; // Add a new variable for tied electoral votes

    const states = Array.from(new Set(data.map(d => d.State)));

    states.forEach(state => {
        const stateVotes = data.filter(d => d.State === state);
        const stateTotalRepublican = d3.sum(stateVotes, d => d.Republican);
        const stateTotalDemocrat = d3.sum(stateVotes, d => d.Democrat);

        // Allocate electoral votes
        if (stateTotalRepublican > stateTotalDemocrat) {
            republicanVotes += stateElectoralVotes[state];
        } else if (stateTotalDemocrat > stateTotalRepublican) {
            democratVotes += stateElectoralVotes[state];
        } else {
            // If it's a tie, add votes to "too close to call"
            tooCloseToCallVotes += stateElectoralVotes[state];
        }
    });

    return { republicanVotes, democratVotes, tooCloseToCallVotes };
}