import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase.config';

// Credit costs
const GENERATION_COST = 1; // 1 credit per image generation
const ENHANCE_PROMPT_COST = 0; // Free prompt enhancement
const EDIT_COST = 1; // 1 credit per edit
const RECREATE_COST = 1; // 1 credit per recreate

// Free trial credits
const FREE_TRIAL_CREDITS = 10; // 10 free credits for new users

// Pricing plans (in credits)
export const CREDIT_PLANS = {
  STARTER: {
    name: 'Starter Pack',
    credits: 50,
    price: 5, // $5
    pricePerCredit: 0.10
  },
  BASIC: {
    name: 'Basic Pack',
    credits: 100,
    price: 9, // $9
    pricePerCredit: 0.09
  },
  PRO: {
    name: 'Pro Pack',
    credits: 250,
    price: 20, // $20
    pricePerCredit: 0.08
  },
  PREMIUM: {
    name: 'Premium Pack',
    credits: 500,
    price: 35, // $35
    pricePerCredit: 0.07
  },
  ULTIMATE: {
    name: 'Ultimate Pack',
    credits: 1000,
    price: 60, // $60
    pricePerCredit: 0.06
  }
};

export class CreditsService {
  /**
   * Get user's current credit balance
   */
  async getUserCredits(userId: string): Promise<number> {
    try {
      console.log('Getting credits for user:', userId);
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        console.log('User document does not exist, creating new user with free trial credits');
        // Create new user with free trial credits
        const newUserData = {
          credits: FREE_TRIAL_CREDITS,
          totalCreditsEarned: FREE_TRIAL_CREDITS,
          totalCreditsSpent: 0,
          plan: 'FREE_TRIAL',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', userId), newUserData);
        console.log('New user created successfully:', newUserData);
        return FREE_TRIAL_CREDITS;
      }
      
      const credits = userDoc.data().credits || 0;
      console.log('User credits loaded:', credits);
      return credits;
    } catch (error) {
      console.error('Error getting user credits:', error);
      throw new Error('Failed to fetch credits');
    }
  }

  /**
   * Get user's full profile including stats
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        // Create new user
        const newUser = {
          credits: FREE_TRIAL_CREDITS,
          totalCreditsEarned: FREE_TRIAL_CREDITS,
          totalCreditsSpent: 0,
          plan: 'FREE_TRIAL',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', userId), newUser);
        return newUser;
      }
      
      return userDoc.data();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to fetch user profile');
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
  async deductCredits(userId: string, cost: number = GENERATION_COST, operation: string = 'generation'): Promise<number> {
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
        totalCreditsSpent: increment(cost),
        lastUpdated: new Date().toISOString()
      });

      // Log the transaction
      await this.logTransaction(userId, -cost, operation, 'debit');
      
      return currentCredits - cost;
    } catch (error) {
      console.error('Error deducting credits:', error);
      throw error;
    }
  }

  /**
   * Add credits to user account (for purchases)
   */
  async addCredits(userId: string, amount: number, planName: string = 'PURCHASE'): Promise<number> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          credits: amount,
          totalCreditsEarned: amount,
          totalCreditsSpent: 0,
          plan: planName,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
        
        // Log the transaction
        await this.logTransaction(userId, amount, planName, 'credit');
        
        return amount;
      }
      
      await updateDoc(userRef, {
        credits: increment(amount),
        totalCreditsEarned: increment(amount),
        plan: planName,
        lastUpdated: new Date().toISOString()
      });

      // Log the transaction
      await this.logTransaction(userId, amount, planName, 'credit');
      
      const updatedDoc = await getDoc(userRef);
      return updatedDoc.data()?.credits || 0;
    } catch (error) {
      console.error('Error adding credits:', error);
      throw new Error('Failed to add credits');
    }
  }

  /**
   * Log credit transaction
   */
  private async logTransaction(userId: string, amount: number, description: string, type: 'credit' | 'debit'): Promise<void> {
    try {
      await addDoc(collection(db, 'users', userId, 'transactions'), {
        amount,
        type,
        description,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging transaction:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Get credit costs
   */
  getCosts() {
    return {
      generation: GENERATION_COST,
      edit: EDIT_COST,
      recreate: RECREATE_COST,
      enhancePrompt: ENHANCE_PROMPT_COST
    };
  }

  /**
   * Get generation cost
   */
  getGenerationCost(): number {
    return GENERATION_COST;
  }

  /**
   * Get edit cost
   */
  getEditCost(): number {
    return EDIT_COST;
  }

  /**
   * Get recreate cost
   */
  getRecreateCost(): number {
    return RECREATE_COST;
  }

  /**
   * Get available plans
   */
  getPlans() {
    return CREDIT_PLANS;
  }

  /**
   * Get free trial credits amount
   */
  getFreeTrialCredits(): number {
    return FREE_TRIAL_CREDITS;
  }
}

export const creditsService = new CreditsService();
