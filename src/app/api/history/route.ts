import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createHistorySchema, validateRequest } from '@/lib/validations'

// GET /api/history - List run history for current user or specific workflow
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')

    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ histories: [] })
    }

    // Build where clause
    const whereClause: { userId: string; workflowId?: string } = { userId: user.id }
    if (workflowId) {
      whereClause.workflowId = workflowId
    }

    const histories = await prisma.workflowRunHistory.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
      take: 50, // Limit to last 50 runs
      include: {
        workflow: {
          select: { name: true }
        }
      }
    })

    return NextResponse.json({ 
      histories: histories.map(h => ({
        id: h.id,
        workflowId: h.workflowId,
        workflowName: h.workflow?.name || 'Unknown',
        runType: h.runType,
        status: h.status,
        duration: h.duration,
        nodeResults: h.nodeResults,
        startedAt: h.startedAt,
        completedAt: h.completedAt,
      }))
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}

// POST /api/history - Create new run history entry
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate request body with Zod
    const validation = await validateRequest(request, createHistorySchema)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const { workflowId, runType, status, duration, nodeResults } = validation.data

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@clerk.dev`,
        }
      })
    }

    // Verify workflow exists and belongs to user
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId: user.id }
    })

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Create history entry
    const history = await prisma.workflowRunHistory.create({
      data: {
        workflowId,
        userId: user.id,
        runType,
        status,
        duration,
        nodeResults,
        completedAt: new Date(),
      }
    })

    return NextResponse.json({ 
      success: true,
      history: {
        id: history.id,
        workflowId: history.workflowId,
        runType: history.runType,
        status: history.status,
        duration: history.duration,
        nodeResults: history.nodeResults,
        startedAt: history.startedAt,
        completedAt: history.completedAt,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating history:', error)
    return NextResponse.json({ error: 'Failed to create history' }, { status: 500 })
  }
}
