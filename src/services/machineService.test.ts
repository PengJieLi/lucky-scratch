import { describe,it,expect } from 'vitest'
import { submitTicket, settleExpired, pendingRewards } from './machineService'
import type { GameState, Ticket } from '../types/game'
const state=():GameState=>({version:2,talentResetCount:0,coins:100,statistics:{totalScratched:0,totalWon:0,totalEarned:0,totalSpent:0,totalPurchased:0},player:{level:1,experience:0,talentPoints:3},talents:{luck:0,wealth:0,efficiency:0,device:0,automation:0},machine:{level:1,currentTask:null,queue:[],maxQueue:1},tickets:[],automation:{enabled:false,autoBuy:false,autoScratch:false,autoSubmit:false,autoCollect:true,ticketType:'starter',purchaseBudget:100,reserveCoins:0,spentBudget:0,batchSize:1},achievements:{},transactions:[],lastActiveAt:0,lastOfflineAt:0})
const ticket=(id:string):Ticket=>({id,gameId:'starter',gameName:'新手票',playType:'number-match',price:10,prize:25,basePrize:25,isWinner:true,result:{},revealedCells:[0,1,2],cellProgress:[1,1,1],scratchProgress:1,status:'scratched',createdAt:1})
describe('machine FIFO and settlement',()=>{
 it('starts first task and rejects a submission when waiting queue is full',()=>{const s=state();const a=ticket('a'),b=ticket('b'),c=ticket('c');s.tickets=[a,b,c];expect(submitTicket(s,a,100)).toBe(true);expect(s.machine.currentTask?.ticketId).toBe('a');expect(submitTicket(s,b,101)).toBe(true);expect(s.machine.queue).toHaveLength(1);expect(submitTicket(s,c,102)).toBe(false);expect(c.status).toBe('scratched')})
 it('settles a ticket only once and starts the next task',()=>{const s=state();const a=ticket('a');s.tickets=[a];submitTicket(s,a,100);expect(pendingRewards(s)).toBe(25);settleExpired(s,6000);expect(s.coins).toBe(125);expect(a.status).toBe('completed');settleExpired(s,7000);expect(s.coins).toBe(125);expect(s.statistics.totalEarned).toBe(25)})
})
