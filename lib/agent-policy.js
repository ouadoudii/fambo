/** Fail-closed policy. Public browser launches must remain disabled until
 * durable abuse protection and a user-consented identity flow exist.
 */
export function agentLaunchAllowed(env=process.env){
 return env.FAMBO_AGENT_LAUNCH_ENABLED==='true' &&
        env.FAMBO_AGENT_RATE_LIMIT_READY==='true' &&
        typeof env.FAMBO_AGENT_SIGNING_KEY==='string' &&
        Buffer.byteLength(env.FAMBO_AGENT_SIGNING_KEY)>=32;
}
