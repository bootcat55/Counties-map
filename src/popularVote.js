import * as d3 from 'd3';

// Calculate total Democrat, Republican, and Other votes across all states
export function calculatePopularVote(data) {
    // Recompute totals with current data
    let totalRepublicanVotes = d3.sum(data, d => d.Republican);
    let totalDemocratVotes = d3.sum(data, d => d.Democrat);
    let totalOtherVotes = d3.sum(data, d => d.OtherVotes);

    // Log the computed totals to debug
    console.log("Calculated Popular Vote Totals:");
    console.log("Total Republican Votes:", totalRepublicanVotes);
    console.log("Total Democrat Votes:", totalDemocratVotes);
    console.log("Total Other Votes:", totalOtherVotes);

    return { totalRepublicanVotes, totalDemocratVotes, totalOtherVotes };
}

// Display popular vote totals with percentages in the UI
export function displayPopularVote(popularVoteResults) {
    // Calculate total votes and percentages
    const totalVotes = popularVoteResults.totalRepublicanVotes + popularVoteResults.totalDemocratVotes + popularVoteResults.totalOtherVotes;
    const democratPercentage = ((popularVoteResults.totalDemocratVotes / totalVotes) * 100).toFixed(1);
    const republicanPercentage = ((popularVoteResults.totalRepublicanVotes / totalVotes) * 100).toFixed(1);
    const otherPercentage = ((popularVoteResults.totalOtherVotes / totalVotes) * 100).toFixed(1);

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
        .style("transform", "translateX(300px)")
        .html(`
            <strong>Democrat Total Votes:</strong> ${popularVoteResults.totalDemocratVotes.toLocaleString()}
            <br><strong>(${democratPercentage}% of total)</strong>
        `);

    // Add Republican total with percentage
    container.append("div")
        .attr("class", "popular-vote-republican")
        .style("margin-left", "100px")
        .style("transform", "translateX(300px)")
        .html(`
            <strong>Republican Total Votes:</strong> ${popularVoteResults.totalRepublicanVotes.toLocaleString()}
            <br><strong>(${republicanPercentage}% of total)</strong>
        `);

    // Add Other Votes total with percentage
    container.append("div")
        .attr("class", "popular-vote-other")
        .style("margin-left", "100px")
        .style("transform", "translateX(300px)")
        .html(`
            <strong>Other Votes:</strong> ${popularVoteResults.totalOtherVotes.toLocaleString()}
            <br><strong>(${otherPercentage}% of total)</strong>
        `);
}

// Recalculate and display popular vote totals
export function recalculateAndDisplayPopularVote(data) {
    console.log("Recalculating and displaying popular vote with data:", data);
    const popularVoteResults = calculatePopularVote(data);
    displayPopularVote(popularVoteResults);
}

// Load vote data and initially calculate popular vote by state
d3.csv('data/usacounty_votes.csv').then(data => {
    data.forEach(d => {
        d.Republican = +d.Republican;
        d.Democrat = +d.Democrat;
        d.OtherVotes = +d['Other Votes'];
    });

    recalculateAndDisplayPopularVote(data);
});
