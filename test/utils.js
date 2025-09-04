const testQueue = [];
let isRunning = false;
let globalPassCount = 0;
let globalFailCount = 0;
let completedTests = 0;

function log(msg, type = 'info') {
  if (typeof document !== 'undefined') {
    // Browser environment
    const logElem = document.getElementById('log');
    
    if (typeof msg == 'object') {
      logElem.innerHTML += (JSON && JSON.stringify ? JSON.stringify(msg, undefined, 2) : msg) + '<br />';
    } else {
      let styledMsg = msg;
      
      switch (type) {
        case 'success':
          styledMsg = `<span style="color: #28a745;">✓ ${msg}</span>`;
          break;
        case 'error':
          styledMsg = `<span style="color: #dc3545;">✗ ${msg}</span>`;
          break;
        case 'info':
          styledMsg = `<span style="color: #4a90e2;">${msg}</span>`;
          break;
        case 'warning':
          styledMsg = `<span style="color: #ffc107;">⚠ ${msg}</span>`;
          break;
        default:
          styledMsg = msg;
      }
      
      logElem.innerHTML += styledMsg + "<br/>";
    }
  } else {
    // Node.js environment
    if (typeof msg == 'object') {
      console.log(JSON && JSON.stringify ? JSON.stringify(msg, undefined, 2) : msg);
    } else {
      // Add emoji/prefix for console output
      let prefix = '';
      switch (type) {
        case 'success':
          prefix = '✓ ';
          break;
        case 'error':
          prefix = '✗ ';
          break;
        case 'warning':
          prefix = '⚠ ';
          break;
        case 'info':
          prefix = 'ℹ ';
          break;
      }
      console.log(prefix + msg);
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

  log(`# ${name}`, 'info')
  
  const t = {
    equal: (actual, expected, msg) => {
      if (actual === expected) {
        passCount++;
        log(`ok - ${msg || `${actual} == ${expected}`}`, 'success')
      } else {
        failCount++;
        log(`not ok - ${msg || 'assertion failed'} (got ${actual}, expected ${expected})`, 'error')
      }
    },
    ok: (value, msg) => {
      if (value) {
        passCount++;
        log(`ok - ${msg}`, 'success')
      } else {
        failCount++;
        log(`not ok - ${msg}`, 'error')
      }
    },
    pass: (msg) => {
      passCount++;
      log(`ok - ${msg}`, 'success')
    },
    match: (str, regex, msg) => {
      if (regex.test(str)) {
        passCount++;
        log(`ok - ${msg || `${str} matches ${regex}`}`, 'success')
      } else {
        failCount++;
        log(`not ok - ${msg || 'regex match failed'}`, 'error')
      }
    },
    end: () => {
      const total = passCount + failCount;
      const status = failCount === 0 ? 'PASS' : 'FAIL';
      const statusColor = failCount === 0 ? '#28a745' : '#dc3545';
      
      log(`${status} - ${passCount}/${total} assertions passed`, failCount === 0 ? 'success' : 'error');
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
  
  log(`<div style="border-top: 2px solid #ccc; margin-top: 20px; padding-top: 10px;">`);
  log(`${overallStatus}`, globalFailCount === 0 ? 'success' : 'error');
  log(`Tests completed: ${completedTests}`, 'info');
  log(`Total assertions: ${totalAssertions}`, 'info');
  log(`Passed: ${globalPassCount}`, 'success');
  log(`Failed: ${globalFailCount}`, 'error');
  log(`</div>`);

  if (typeof window === 'undefined') {
    // Node.js environment - exit with appropriate code
    process.exit(globalFailCount === 0 ? 0 : 1);
  }
}

export default test
