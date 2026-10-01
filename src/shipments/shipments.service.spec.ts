import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { describe, jest, beforeEach, it, expect} from '@jest/globals';
import { ShipmentsService } from './shipments.service';
import { ShipmentEntity } from './entities/shipment.entity';
import { ShipmentRulesService } from './shipment-rules.service';
import { ShipmentStatus } from './shipment-status.enum';

describe('ShipmentsService', () => {
  let service: ShipmentsService;

  const shipmentsRepositoryMock = {
    find: jest.fn<() => Promise<ShipmentEntity[]>>(),
    findOneBy: jest.fn <() => Promise<ShipmentEntity | null>>(),
    create: jest.fn <(data: Partial<ShipmentEntity>) => ShipmentEntity>(),
    save: jest.fn <(shipment: ShipmentEntity) => Promise<ShipmentEntity>>(),
  };

  const shipmentRulesServiceMock = {
    ensureCanBeDispatched: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        {
          provide: getRepositoryToken(ShipmentEntity),
          useValue: shipmentsRepositoryMock,
        },
        {
          provide: ShipmentRulesService,
          useValue: shipmentRulesServiceMock,
        },
      ],
    }).compile();

    service = module.get<ShipmentsService>(ShipmentsService);
  });

  // Caso 1
  it('is defined', () => {
    expect(service).toBeDefined();
  });

  // Caso 2
  it('returns all shipments', async () => {
    const shipmentsMock = [
      { id: 1, trackingCode: 'SHIP-001', destination: 'Bogota', status: ShipmentStatus.CREATED },
      { id: 2, trackingCode: 'SHIP-002', destination: 'Medellin', status: ShipmentStatus.DISPATCHED },
    ] as ShipmentEntity[];

    shipmentsRepositoryMock.find.mockResolvedValue(shipmentsMock);

    const result = await service.findAll();

    expect(result).toEqual(shipmentsMock);
    expect(shipmentsRepositoryMock.find).toHaveBeenCalledTimes(1);
  });

  // Caso 3
  it('returns a shipment when the id exists', async () => {
    const shipmentMock = {
      id: 7,
      trackingCode: 'SHIP-007',
      destination: 'Cali',
      status: ShipmentStatus.CREATED,
    } as ShipmentEntity;

    shipmentsRepositoryMock.findOneBy.mockResolvedValue(shipmentMock);

    const result = await service.findOne(7);

    expect(result).toEqual(shipmentMock);
    expect(shipmentsRepositoryMock.findOneBy).toHaveBeenCalledWith({ id: 7 });
  });

  // Caso 4
  it('throws NotFoundException when the id does not exist', async () => {

    shipmentsRepositoryMock.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
    expect(shipmentsRepositoryMock.findOneBy).toHaveBeenCalledWith({ id: 999 });
  });

  // Caso 5
  it('creates and saves a shipment', async () => {

    const createDto = {
    trackingCode: 'SHIP-100',
    destination: 'Cali',
    };

  const createdEntity = {
    trackingCode: createDto.trackingCode,
    destination: createDto.destination,
    status: ShipmentStatus.CREATED,
  } as ShipmentEntity;

  const savedEntity = {
    ...createdEntity,
    id: 1,
  } as ShipmentEntity;

    shipmentsRepositoryMock.create.mockReturnValue(createdEntity);
    shipmentsRepositoryMock.save.mockResolvedValue(savedEntity);

    const result = await service.create(createDto);

    expect(shipmentsRepositoryMock.create).toHaveBeenCalledWith({
      ...createDto,
      status: ShipmentStatus.CREATED,
    });
    expect(shipmentsRepositoryMock.save).toHaveBeenCalledWith(createdEntity);
    expect(result).toEqual(savedEntity);
  });

  // Caso 6
  it('dispatches and saves a valid shipment', async () => {
    
    const shipmentId = 1;
    const existingShipment = {
      id: shipmentId,
      trackingCode: 'SHIP-100',
      destination: 'Cali',
      status: ShipmentStatus.CREATED,
    } as ShipmentEntity;

    const updatedShipment = {
      ...existingShipment,
      status: ShipmentStatus.DISPATCHED,
    } as ShipmentEntity;

    shipmentsRepositoryMock.findOneBy.mockResolvedValue(existingShipment);
    shipmentsRepositoryMock.save.mockResolvedValue(updatedShipment);

  
    const result = await service.dispatch(shipmentId);

  
    expect(shipmentsRepositoryMock.findOneBy).toHaveBeenCalledWith({ id: shipmentId });
    expect(shipmentRulesServiceMock.ensureCanBeDispatched).toHaveBeenCalledWith(existingShipment);
    expect(shipmentsRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: shipmentId,
        status: ShipmentStatus.DISPATCHED,
      }),
    );
    expect(result).toEqual(updatedShipment);
  });
});