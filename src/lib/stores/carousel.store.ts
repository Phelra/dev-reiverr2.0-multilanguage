import { writable } from 'svelte/store';
import { reiverrApi, type CarouselDto } from '../apis/reiverr/reiverr-api';

const carousels = writable<CarouselDto[]>([]);

async function fetchAllCarousels() {
  try {
    console.log('Fetching all carousels...');
    const fetchedCarousels = await reiverrApi.getAllCarousels();
    if (fetchedCarousels) {
      console.log(`Fetched ${fetchedCarousels.length} carousels.`);
      carousels.set(fetchedCarousels);
      console.log("carousels : ",fetchedCarousels);
    } else {
      console.warn('No carousels found.');
    }
  } catch (error) {
    console.error('Error fetching carousels:', error);
  }
}

async function createCarousel(newCarousel: CarouselDto) {
  try {
    console.log('Creating a new carousel...');
    console.log('Payload:', newCarousel);  // Log the data being sent
    
    const response = await reiverrApi.createCarousel(newCarousel);
    
    if (response.carousel) {
      carousels.update((existingCarousels) => [...existingCarousels, response.carousel]);
      console.log('New carousel created successfully:', response.carousel);
    } else {
      console.warn('Failed to create a new carousel. Response details:', response);
      console.warn('Error message:', response.error?.message);
    }
  } catch (error) {
    // Enhanced error logging to provide more insights
    console.error('Error creating carousel:', error);
    if (error.response) {
      console.error('Server responded with:', error.response.status, error.response.statusText);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('Request was made but no response received:', error.request);
    } else {
      console.error('Unexpected error during request setup:', error.message);
    }
  }
}

async function updateCarousel(id: number, updatedData: Partial<CarouselDto>) {
  try {
    console.log(`Updating carousel with ID ${id}...`);
    const response = await reiverrApi.updateCarousel(id, updatedData);
    if (response.carousel) {
      carousels.update((existingCarousels) =>
        existingCarousels.map((carousel) => (carousel.id === id ? response.carousel : carousel))
      );
      console.log(`Carousel with ID ${id} updated successfully.`);
    } else {
      console.warn(`Failed to update carousel with ID ${id}.`);
    }
  } catch (error) {
    console.error(`Error updating carousel with ID ${id}:`, error);
  }
}

async function deleteCarousel(id: number) {
  try {
    console.log(`Deleting carousel with ID ${id}...`);
    const response = await reiverrApi.deleteCarousel(id);
    if (response) {
      carousels.update((existingCarousels) => existingCarousels.filter((carousel) => carousel.id !== id));
      console.log(`Carousel with ID ${id} successfully deleted.`);
    } else {
      console.warn(`Failed to delete carousel with ID ${id}.`);
    }
  } catch (error) {
    console.error(`Error deleting carousel with ID ${id}:`, error);
  }
}

export const carouselStore = {
  subscribe: carousels.subscribe,
  fetchAllCarousels,
  createCarousel,
  updateCarousel,
  deleteCarousel
};
