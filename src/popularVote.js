import * as d3 from 'd3';

export function calculatePopularVote(data) {
    console.log("Data loaded for calculating popular vote:", data); // Log to confirm data loading

    // Calculate total Democrat and Republican votes across all states
    const stateVotes = d3.rollups(
        data,
        v => ({
            totalRepublican: d3.sum(v, d => +d.Republican),
            totalDemocrat: d3.sum(v, d => +d.Democrat)
        }),
        d => d.State // Group by state
    );

    // Aggregate the totals across all states
    let totalRepublicanVotes = 0;
    let totalDemocratVotes = 0;
    stateVotes.forEach(([state, votes]) => {
        totalRepublicanVotes += votes.totalRepublican;
        totalDemocratVotes += votes.totalDemocrat;
    });

    console.log("Calculated popular vote totals:", { totalRepublicanVotes, totalDemocratVotes }); // Log the results

    return { totalRepublicanVotes, totalDemocratVotes };
}

export function displayPopularVote(popularVoteResults) {
    console.log("Displaying popular vote results:", popularVoteResults); // Confirm display function call

    // Calculate total votes and percentages
    const totalVotes = popularVoteResults.totalRepublicanVotes + popularVoteResults.totalDemocratVotes;
    const democratPercentage = ((popularVoteResults.totalDemocratVotes / totalVotes) * 100).toFixed(1);
    const republicanPercentage = ((popularVoteResults.totalRepublicanVotes / totalVotes) * 100).toFixed(1);

    // Clear any existing content in the popular vote container
    const container = d3.select("#popular-vote-container").html("");

    // Set up a flex container for horizontal alignment
    container
        .style("display", "flex")
        .style("justify-content", "left")
        .style("margin-top", "-50px");

    // Add Democrat total with percentage
    container.append("div")
        .attr("class", "popular-vote-democrat")
        .style("margin-right", "20px")
        .style("transform", "translateX(300px)") // Shift 300px to the right
        .html(`
            <strong>Democrat Total Votes:</strong> ${popularVoteResults.totalDemocratVotes.toLocaleString()}
            <br><strong>(${democratPercentage}% of total)</strong>
        `);

    // Add Republican total with percentage
    container.append("div")
        .attr("class", "popular-vote-republican")
        .style("margin-left", "100px")
        .style("transform", "translateX(300px)") // Shift 300px to the right
        .html(`
            <strong>Republican Total Votes:</strong> ${popularVoteResults.totalRepublicanVotes.toLocaleString()}
            <br><strong>(${republicanPercentage}% of total)</strong>
        `);
}

// Load the vote data and calculate popular vote by state
d3.csv('data/usacounty_votes.csv').then(data => {
    data.forEach(d => {
        d.Republican = +d.Republican;
        d.Democrat = +d.Democrat;
    });

    const popularVoteResults = calculatePopularVote(data);
    displayPopularVote(popularVoteResults);
});

