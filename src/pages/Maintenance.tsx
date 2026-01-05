import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Clock, Sparkles } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full text-center space-y-8"
      >
        {/* Animated Icon */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="inline-block"
        >
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl">
            <Wrench className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            We're Building Something Amazing
          </h1>
          <p className="text-xl text-gray-600">
            Yassu is getting better! We're adding exciting new AI-powered features.
          </p>
        </div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-xl p-8 space-y-4"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Next Steps Engine</h3>
              <p className="text-sm text-gray-600">Get personalized recommendations for your startup journey</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Smart Team Matching</h3>
              <p className="text-sm text-gray-600">AI suggests the perfect roles to recruit for your idea</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Enhanced Profiles & Reputation</h3>
              <p className="text-sm text-gray-600">Professional profiles with reputation scores</p>
            </div>
          </div>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2 text-gray-600"
        >
          <Clock className="w-5 h-5" />
          <span className="text-lg">Back online soon!</span>
        </motion.div>

        {/* Contact */}
        <p className="text-sm text-gray-500">
          Questions? Reach out to us at{' '}
          <a href="mailto:support@yassu.ai" className="text-purple-600 hover:underline">
            support@yassu.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
