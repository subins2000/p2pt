const testQueue = [];
let isRunning = false;
let globalPassCount = 0;
let globalFailCount = 0;
let completedTests = 0;

function log(msg) {
  if (typeof document !== 'undefined') {
    // Browser environment
    const logElem = document.getElementById('log');
    
    if (typeof msg == 'object') {
      logElem.innerHTML += (JSON && JSON.stringify ? JSON.stringify(msg, undefined, 2) : msg) + '<br />';
    } else {
      logElem.innerHTML += msg + "<br/>";
    }
  } else {
    // Node.js environment
    if (typeof msg == 'object') {
      console.log(JSON && JSON.stringify ? JSON.stringify(msg, undefined, 2) : msg);
    } else {
      console.log(msg);
    }
  }
}

function test(name, fn) {
  testQueue.push({ name, fn });
  
  if (!isRunning) {
    runNextTest();
  }
}

function runNextTest() {
  if (testQueue.length === 0) {
    isRunning = false;
    showFinalSummary();
    return;
  }
  
  isRunning = true;
  const { name, fn } = testQueue.shift();
  
  let passCount = 0;
  let failCount = 0;

  log(`<span style="color: #4a90e2; font-weight: bold; font-size: 1.1em;"># ${name}</span>`)
  
  const t = {
    equal: (actual, expected, msg) => {
      if (actual === expected) {
        passCount++;
        log(`<span style="color: #28a745;">✓ ok</span> - ${msg || `${actual} == ${expected}`}`)
      } else {
        failCount++;
        log(`<span style="color: #dc3545;">✗ not ok</span> - ${msg || 'assertion failed'} (got ${actual}, expected ${expected})`)
      }
    },
    ok: (value, msg) => {
      if (value) {
        passCount++;
        log(`<span style="color: #28a745;">✓ ok</span> - ${msg}`)
      } else {
        failCount++;
        log(`<span style="color: #dc3545;">✗ not ok</span> - ${msg}`)
      }
    },
    pass: (msg) => {
      passCount++;
      log(`<span style="color: #28a745;">✓ ok</span> - ${msg}`)
    },
    match: (str, regex, msg) => {
      if (regex.test(str)) {
        passCount++;
        log(`<span style="color: #28a745;">✓ ok</span> - ${msg || `${str} matches ${regex}`}`)
      } else {
        failCount++;
        log(`<span style="color: #dc3545;">✗ not ok</span> - ${msg || 'regex match failed'}`)
      }
    },
    end: () => {
      const total = passCount + failCount;
      const status = failCount === 0 ? 'PASS' : 'FAIL';
      const statusColor = failCount === 0 ? '#28a745' : '#dc3545';
      
      log(`<span style="color: ${statusColor}; font-weight: bold;">${status}</span> - ${passCount}/${total} assertions passed`);
      log("");
      
      globalPassCount += passCount;
      globalFailCount += failCount;
      completedTests++;
      
      setTimeout(runNextTest, 0);
    }
  }
  
  fn(t)
}

function showFinalSummary() {
  const totalAssertions = globalPassCount + globalFailCount;
  const overallStatus = globalFailCount === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED';
  const statusColor = globalFailCount === 0 ? '#28a745' : '#dc3545';
  
  log(`<div style="border-top: 2px solid #ccc; margin-top: 20px; padding-top: 10px;">`);
  log(`<span style="color: ${statusColor}; font-weight: bold; font-size: 1.2em;">${overallStatus}</span>`);
  log(`Tests completed: ${completedTests}`);
  log(`Total assertions: ${totalAssertions}`);
  log(`<span style="color: #28a745;">Passed: ${globalPassCount}</span>`);
  log(`<span style="color: #dc3545;">Failed: ${globalFailCount}</span>`);
  log(`</div>`);
}

export default test
