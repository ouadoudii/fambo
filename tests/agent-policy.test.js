import test from 'node:test';
import assert from 'node:assert/strict';
import {agentLaunchAllowed} from '../lib/agent-policy.js';
test('launch is disabled by default even when Browserbase keys exist',()=>{
 assert.equal(agentLaunchAllowed({BROWSERBASE_API_KEY:'key',BROWSERBASE_PROJECT_ID:'project'}),false);
 assert.equal(agentLaunchAllowed({FAMBO_AGENT_LAUNCH_ENABLED:'true',FAMBO_AGENT_SIGNING_KEY:'a'.repeat(40)}),false);
});
test('launch requires explicit durable rate limit and strong signing key',()=>{
 const config={FAMBO_AGENT_LAUNCH_ENABLED:'true',FAMBO_AGENT_RATE_LIMIT_READY:'true',FAMBO_AGENT_SIGNING_KEY:'x'.repeat(40)};
 assert.equal(agentLaunchAllowed(config),true);
 assert.equal(agentLaunchAllowed({...config,FAMBO_AGENT_SIGNING_KEY:'weak'}),false);
 assert.equal(agentLaunchAllowed({...config,FAMBO_AGENT_RATE_LIMIT_READY:'false'}),false);
});
