// Learn more: https://github.com/testing-library/jest-dom
// import '@testing-library/jest-dom'

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

