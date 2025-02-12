
document.addEventListener('DOMContentLoaded', function () {
    const processCountInput = document.getElementById('process-count');
    const algorithmSelect = document.getElementById('algorithm');
    const rrInput = document.getElementById('rr-input');
    const mlfqInput = document.getElementById('mlfq-input');
    const queueCountInput = document.getElementById('queue-count');
    const queuesConfig = document.getElementById('queues-config');
    const processInputs = document.getElementById('process-inputs');

    // Show/hide algorithm-specific inputs
    algorithmSelect.addEventListener('change', function () {
        rrInput.style.display = this.value === 'rr' ? 'block' : 'none';
        mlfqInput.style.display = this.value === 'mlfq' ? 'block' : 'none';
        updateProcessInputs();
    });

    // Update process inputs when count changes
    processCountInput.addEventListener('change', updateProcessInputs);
    queueCountInput.addEventListener('change', updateQueueConfigs);

    function updateProcessInputs() {
        const count = parseInt(processCountInput.value);
        const algorithm = algorithmSelect.value;
        processInputs.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const row = document.createElement('div');
            row.className = 'process-input-row';
            row.innerHTML = `
                <div class="form-group" style="flex: 1;">
                    <label>Process ${i + 1} Arrival Time:</label>
                    <input type="number" class="form-control arrival-time" min="0" value="0">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Burst Time:</label>
                    <input type="number" class="form-control burst-time" min="1" value="${i + 1}">
                </div>
            `;
            processInputs.appendChild(row);
        }
    }

    function updateQueueConfigs() {
        const count = parseInt(queueCountInput.value);
        queuesConfig.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const queueDiv = document.createElement('div');
            queueDiv.className = 'queue-config';
            queueDiv.innerHTML = `
                <div class="queue-header">Queue ${i + 1}</div>
                <div class="form-group">
                    <label>Scheduling Algorithm:</label>
                    <select class="form-control queue-algorithm">
                        <option value="fcfs">First Come First Serve</option>
                        <option value="rr">Round Robin</option>
                    </select>
                </div>
                <div class="form-group rr-quantum" style="display: none;">
                    <label>Time Quantum:</label>
                    <input type="number" class="form-control time-quantum" min="1" value="${Math.pow(2, i)}">
                </div>
            `;
            queuesConfig.appendChild(queueDiv);

            // Add event listener to show/hide time quantum input
            const algoSelect = queueDiv.querySelector('.queue-algorithm');
            const rrQuantum = queueDiv.querySelector('.rr-quantum');
            algoSelect.addEventListener('change', function () {
                rrQuantum.style.display = this.value === 'rr' ? 'block' : 'none';
            });
        }
    }

    // Initialize the process inputs
    updateProcessInputs();

    document.getElementById('simulate').addEventListener('click', async function () {
        // Collecting process data
        const processes = Array.from(document.querySelectorAll('.process-input-row')).map((row, index) => {
            return {
                id: index + 1,
                arrivalTime: parseInt(row.querySelector('.arrival-time').value),
                burstTime: parseInt(row.querySelector('.burst-time').value),
            };
        });

        // Collect MLFQ configuration if selected
        let mlfqConfig = null;
        if (algorithmSelect.value === 'mlfq') {
            mlfqConfig = Array.from(document.querySelectorAll('.queue-config')).map(queue => {
                const algo = queue.querySelector('.queue-algorithm').value;
                return {
                    algorithm: algo,
                    timeQuantum: algo === 'rr' ?
                        parseInt(queue.querySelector('.time-quantum').value) : null
                };
            });
        }


        try {
            console.log(processes, mlfqConfig)

            // console.log('Simulating with:', {
            //     algorithm: algorithmSelect.value,
            //     processes,
            //     timeQuantum: document.getElementById('time-quantum').value,
            //     mlfqConfig
            // });

            const response = await fetch(`https://cpu-algo-backend.vercel.app/api/scheduler/simulate`, {
                // credentials : 'include',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    processes: processes,
                    algorithm: algorithmSelect.value,
                    queues: mlfqConfig,
                    timeQuantum: parseInt(document.getElementById('time-quantum').value)
                })
                
            });
                console.log(response)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseJSON = await response.json();
            const ganttChart = responseJSON.data.gant;
            const analysedData = responseJSON.data.proc;

            console.log(ganttChart)

            updateGanttChart(ganttChart)
            createProcessDetailsTable(analysedData)

        } catch (error) {
            console.log("ERRORRR OCCURED!")
            throw error;
        }

    });

    function updateGanttChart(executionSequence) {
        const ganttContainer = document.getElementById('gantt-container');
        const timeline = document.getElementById('timeline');

        ganttContainer.innerHTML = '';
        timeline.innerHTML = '';

        const totalTime = executionSequence[executionSequence.length - 1].endTime;
        const BLOCK_WIDTH = 100;

        executionSequence.forEach((block, index) => {
            const ganttBlock = document.createElement('div');
            ganttBlock.className = 'gantt-block';
            ganttBlock.style.width = `${BLOCK_WIDTH}px`;

            if (block.isCPUIdle) {
                ganttBlock.classList.add('idle');
                ganttBlock.innerHTML = `
                    <div class="process-id">IDLE</div>
                    <div class="time-label">${block.startTime}-${block.endTime}</div>
                `;
            }
            else {
                ganttBlock.style.backgroundColor = getProcessColor(block.processId);
                ganttBlock.innerHTML = `
                    <div class="process-id">P${block.processId}</div>
                    <div class="time-label">${block.startTime}-${block.endTime}</div>
                `;
            }
            ganttContainer.appendChild(ganttBlock);

            // Time markers
            if (index === 0) {
                // First block gets both start and end marker
                const firstMarker = document.createElement('div');
                firstMarker.className = 'time-marker first';
                firstMarker.style.left = '0';
                firstMarker.textContent = block.startTime;
                timeline.appendChild(firstMarker);
            }

            // End marker for each block
            const endMarker = document.createElement('div');
            endMarker.className = 'time-marker';
            endMarker.style.left = `${(index + 1) * BLOCK_WIDTH}px`;
            endMarker.textContent = block.endTime;
            timeline.appendChild(endMarker);
        });
    }
    function createProcessDetailsTable(processes) {
        const table = document.createElement('table');
        table.className = 'process-details-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
        <tr>
            <th>PID</th>
            <th>Arrival Time</th>
            <th>Burst Time</th>
            <th>Turnaround Time</th>
            <th>Completion Time</th>
            <th>Waiting Time</th>
        </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        processes.sort((p1, p2) => p1.pid - p2.pid);
        // console.log(processes)

        processes.forEach(process => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${process.pid}</td>
            <td>${process.arrivalTime}</td>
            <td>${process.burstTime}</td>
            <td>${process.turnaroundTime}</td>
            <td>${process.completionTime}</td>
            <td>${process.waitingTime}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        const tableContainer = document.getElementById('process-details-container');
        tableContainer.innerHTML = ''; 
        tableContainer.appendChild(table);
    }

    function getProcessColor(processId) {
        const colors = [
            "#f1a3d5", "#c7e98f", "#8a98f5", "#dcae45", "#7fb89c",
            "#5f9df3", "#ea5c85", "#93db6f", "#4a8cb9", "#e3c76f",
            "#9c77f2", "#d37e9a", "#76d2d4", "#e6b54b", "#ba6c9f",
            "#f28c53", "#68c9ae", "#8b70df", "#c3f07e", "#ff8cb9",
            "#bfa8f3", "#6fa2ce", "#7cdf9f", "#e89d71", "#92b8f7",
            "#d37fa8", "#9ce47a", "#fb8e64", "#b2e58e", "#4b86df",
            "#f2a67c", "#7aa7d9", "#9ccf89", "#f5b39a", "#63b8ed",
            "#b89dc9", "#6ec2a3", "#dda16e", "#97d3b5", "#8a6ff2",
            "#f5a869", "#b9d680", "#5f93ec", "#d89ab3", "#81e4b9",
            "#f48d6f", "#73bdf0", "#ae92e3", "#e5d079", "#8dc8ea",
            "#ef7b97", "#9cd8a3", "#89a9f7", "#c6e46c", "#a48ef6",
            "#f2a379", "#8dcbef", "#e6c8a4", "#79b6d9", "#a3df8e",
            "#ce95e4", "#e8c572", "#86b3df", "#d09dbf", "#91dd7c",
            "#f5a68e", "#8ac9db", "#e59f8b", "#67aedf", "#bfdb97",
            "#f09b81", "#75cdf2", "#b499d5", "#e8d17f", "#88bce3",
            "#f4978a", "#97e67b", "#83b6f7", "#e6d285", "#a07eef",
            "#f5b89a", "#78b8d6", "#e29c87", "#a3d49f", "#95adef",
            "#e7a56f", "#b4e288", "#83b2e6", "#f3a58f", "#6cb3df",
            "#e89f79", "#7bd3b9", "#8c8def", "#f2b68a", "#94c4ea"
        ];


        return colors[processId % colors.length];
    }


    // const sampleData = [
    //     {processId: 1, startTime: 0, endTime: 3, isCPUIdle: false },
    //     {processId: 0, startTime: 3, endTime: 4, isCPUIdle: true },  // CPU idle
    //     {processId: 2, startTime: 4, endTime: 7, isCPUIdle: false },
    //     {processId: 3, startTime: 7, endTime: 9, isCPUIdle: false },
    //     {processId: 4, startTime: 9, endTime: 14, isCPUIdle: false }
    // ];
    // updateGanttChart(sampleData);    
});
