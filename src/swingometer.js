import * as d3 from 'd3';

export function createSwingometer(containerId) {
    const width = 400;
    const height = 200;
    const radius = Math.min(width, height);

    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height})`);

    const arc = d3.arc()
        .innerRadius(radius * 0.5)
        .outerRadius(radius * 0.9)
        .startAngle(d => d.startAngle)
        .endAngle(d => d.endAngle);

    const updateSwingometer = (votes) => {
        const totalVotes = votes.Republican + votes.Democrat + votes.OtherVotes;
        const angles = [
            { party: 'Republican', percentage: votes.Republican / totalVotes, color: 'red' },
            { party: 'Democrat', percentage: votes.Democrat / totalVotes, color: 'blue' },
            { party: 'Other', percentage: votes.OtherVotes / totalVotes, color: 'purple' },
        ];

        let startAngle = -Math.PI / 2;
        const data = angles.map(d => {
            const endAngle = startAngle + d.percentage * Math.PI;
            const arcData = { ...d, startAngle, endAngle };
            startAngle = endAngle;
            return arcData;
        });

        const arcs = g.selectAll('path').data(data);

        // Update existing arcs
        arcs.attr('d', arc)
            .attr('fill', d => d.color);

        // Add new arcs
        arcs.enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', d => d.color);

        // Remove old arcs
        arcs.exit().remove();
    };

    return updateSwingometer;
}
