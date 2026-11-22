import { describe, expect, it } from 'vitest';
import { submitWinner, tickMachine } from '../src/domain/machine';
import type { GameState, Ticket } from '../src/types/game';
function state(): GameState { return { version:1, coins:0, player:{level:1,experience:0,talentPoints:3}, talents:{luck:0,wealth:0}, statistics:{totalScratched:0,totalWon:0,totalEarned:0,totalSpent:0}, tickets:[], machine:{currentTask:null,queue:[],maxQueue:5}, transactions:[], lastActiveAt:0 }; }
function ticket(id: string): Ticket { return {id,gameId:'starter',name:'starter',price:10,baseWinRate:.3,basePrize:25,prize:25,isWinner:true,status:'scratched',createdAt:1}; }
describe('machine domain', () => {
  it('starts the first submitted task immediately and queues subsequent tasks FIFO', () => {
    const s=state(); const a=ticket('a'), b=ticket('b'); s.tickets.push(a,b);
    submitWinner(s,a,100); submitWinner(s,b,101);
    expect(s.machine.currentTask?.ticketId).toBe('a');
    expect(s.machine.queue[0]?.ticketId).toBe('b');
  });
  it('does not count the active task against the five waiting slots', () => {
    const s=state();
    for(let i=0;i<7;i++){ const t=ticket(String(i)); s.tickets.push(t); const r=submitWinner(s,t,100+i); if(i<6) expect(r.ok).toBe(true); else expect(r.ok).toBe(false); }
    expect(s.machine.queue).toHaveLength(5);
    expect(s.tickets[6].status).toBe('scratched');
  });
  it('settles once and starts the next queued task', () => {
    const s=state(); const a=ticket('a'),b=ticket('b'); s.tickets.push(a,b); submitWinner(s,a,100); submitWinner(s,b,101);
    const task=s.machine.currentTask!; task.endAt=200;
    tickMachine(s,200); expect(s.coins).toBe(25); expect(s.machine.currentTask?.ticketId).toBe('b');
    tickMachine(s,200); expect(s.coins).toBe(25);
  });
});
