import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase.config';

const GENERATION_COST = 10; // Cost per image generation
const ENHANCE_PROMPT_COST = 5; // Cost per prompt enhancement
const DEFAULT_CREDITS = 1000; // Default credits for new users

export class CreditsService {
  /**
   * Get user's current credit balance
   */
  async getUserCredits(userId: string): Promise<number> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        // Create new user with default credits
        await setDoc(doc(db, 'users', userId), {
          credits: DEFAULT_CREDITS,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
        return DEFAULT_CREDITS;
      }
      
      return userDoc.data().credits || 0;
    } catch (error) {
      console.error('Error getting user credits:', error);
      throw new Error('Failed to fetch credits');
    }
  }

  /**
   * Check if user has enough credits for an operation
   */
  async hasEnoughCredits(userId: string, cost: number = GENERATION_COST): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    return credits >= cost;
  }

  /**
   * Deduct credits from user account
   */
  async deductCredits(userId: string, cost: number = GENERATION_COST): Promise<number> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const currentCredits = userDoc.data().credits || 0;
      
      if (currentCredits < cost) {
        throw new Error('Insufficient credits');
      }
      
      await updateDoc(userRef, {
        credits: increment(-cost),
        lastUpdated: new Date().toISOString()
      });
      
      return currentCredits - cost;
    } catch (error) {
      console.error('Error deducting credits:', error);
      throw error;
    }
  }

  /**
   * Add credits to user account (for admin/purchases)
   */
  async addCredits(userId: string, amount: number): Promise<number> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          credits: amount,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
        return amount;
      }
      
      await updateDoc(userRef, {
        credits: increment(amount),
        lastUpdated: new Date().toISOString()
      });
      
      const updatedDoc = await getDoc(userRef);
      return updatedDoc.data()?.credits || 0;
    } catch (error) {
      console.error('Error adding credits:', error);
      throw new Error('Failed to add credits');
    }
  }

  /**
   * Set user credits to a specific amount (admin only)
   */
  async setCredits(userId: string, amount: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        credits: amount,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error setting credits:', error);
      throw new Error('Failed to set credits');
    }
  }

  /**
   * Get the cost of a generation
   */
  getGenerationCost(): number {
    return GENERATION_COST;
  }

  /**
   * Get the cost of enhancing a prompt
   */
  getEnhancePromptCost(): number {
    return ENHANCE_PROMPT_COST;
  }
}

export const creditsService = new CreditsService();
