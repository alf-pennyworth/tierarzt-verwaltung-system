/**
 * Patients Router
 * 
 * GET  /patients     - List patients (paginated)
 * POST /patients     - Create patient
 * GET  /patients/:id - Get patient by ID
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

import { 
  PatientCreateSchema, 
  PatientQuerySchema,
  PatientResponseSchema,
  UUIDSchema 
} from '../schemas/index.js';
import { ApiError } from '../middleware/error-handler.js';
import { requireScope } from '../middleware/auth.js';

const app = new Hono();

// ============================================
// GET /patients - List patients
// ============================================

app.get('/', 
  requireScope('read'),
  zValidator('query', PatientQuerySchema),
  async (c) => {
    const praxisId = c.get('praxisId');
    const { page, limit, species, search } = c.req.valid('query');
    
    // TODO: Replace with actual database query
    // const { data, count } = await db.query.patients.findMany({
    //   where: and(
    //     eq(patients.praxisId, praxisId),
    //     species ? eq(patients.species, species) : undefined,
    //     search ? ilike(patients.name, `%${search}%`) : undefined,
    //   ),
    //   limit,
    //   offset: (page - 1) * limit,
    //   orderBy: desc(patients.createdAt),
    // });
    
    // Mock response for development
    const mockPatients = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        praxis_id: praxisId,
        name: 'Bello',
        species: 'Hund',
        breed: 'Labrador',
        gender: 'male',
        birth_date: '2020-03-15',
        owner_name: 'Max Mustermann',
        owner_phone: '+49 30 123456',
        owner_email: 'max@example.de',
        notes: 'Regular patient',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    const total = 1;
    const totalPages = Math.ceil(total / limit);
    
    return c.json({
      data: mockPatients,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    });
  }
);

// ============================================
// POST /patients - Create patient
// ============================================

app.post('/',
  requireScope('write'),
  zValidator('json', PatientCreateSchema),
  async (c) => {
    const praxisId = c.get('praxisId');
    const data = c.req.valid('json');
    
    // TODO: Insert into database
    // const patient = await db.insert(patients).values({
    //   ...data,
    //   praxisId,
    // }).returning();
    
    // Mock response
    const patient = {
      id: crypto.randomUUID(),
      praxis_id: praxisId,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return c.json(patient, 201);
  }
);

// ============================================
// GET /patients/:id - Get patient by ID
// ============================================

app.get('/:id',
  requireScope('read'),
  async (c) => {
    const praxisId = c.get('praxisId');
    const id = c.req.param('id');
    
    // Validate UUID
    const parseResult = UUIDSchema.safeParse(id);
    if (!parseResult.success) {
      throw ApiError.badRequest('Invalid patient ID', [
        { field: 'id', message: 'ID must be a valid UUID' }
      ]);
    }
    
    // TODO: Query database
    // const patient = await db.query.patients.findFirst({
    //   where: and(
    //     eq(patients.id, id),
    //     eq(patients.praxisId, praxisId),
    //   ),
    // });
    
    // Mock response
    const patient = {
      id,
      praxis_id: praxisId,
      name: 'Bello',
      species: 'Hund',
      breed: 'Labrador',
      gender: 'male',
      birth_date: '2020-03-15',
      owner_name: 'Max Mustermann',
      owner_phone: '+49 30 123456',
      owner_email: 'max@example.de',
      notes: 'Regular patient',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // if (!patient) {
    //   throw ApiError.notFound('Patient');
    // }
    
    return c.json(patient);
  }
);

// ============================================
// PUT /patients/:id - Update patient
// ============================================

app.put('/:id',
  requireScope('write'),
  zValidator('json', PatientCreateSchema.partial()),
  async (c) => {
    const praxisId = c.get('praxisId');
    const id = c.req.param('id');
    const data = c.req.valid('json');
    
    // Validate UUID
    const parseResult = UUIDSchema.safeParse(id);
    if (!parseResult.success) {
      throw ApiError.badRequest('Invalid patient ID');
    }
    
    // TODO: Update in database
    // const patient = await db.update(patients)
    //   .set({ ...data, updatedAt: new Date() })
    //   .where(and(
    //     eq(patients.id, id),
    //     eq(patients.praxisId, praxisId),
    //   ))
    //   .returning();
    
    // Mock response
    const patient = {
      id,
      praxis_id: praxisId,
      ...data,
      updated_at: new Date().toISOString(),
    };
    
    return c.json(patient);
  }
);

// ============================================
// DELETE /patients/:id - Delete patient
// ============================================

app.delete('/:id',
  requireScope('write'),
  async (c) => {
    const praxisId = c.get('praxisId');
    const id = c.req.param('id');
    
    // Validate UUID
    const parseResult = UUIDSchema.safeParse(id);
    if (!parseResult.success) {
      throw ApiError.badRequest('Invalid patient ID');
    }
    
    // TODO: Delete from database (or soft delete)
    // await db.delete(patients).where(and(
    //   eq(patients.id, id),
    //   eq(patients.praxisId, praxisId),
    // ));
    
    return c.json({ success: true }, 204);
  }
);

export default app;