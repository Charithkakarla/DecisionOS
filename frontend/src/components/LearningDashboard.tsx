import React, { useEffect, useState } from 'react';
import { Brain, TrendingUp, Lightbulb, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { WorkflowState } from '../types/agent';

interface LearningDashboardProps {
  workflowState?: WorkflowState;
}

export default function LearningDashboard({ workflowState }: LearningDashboardProps) {
  const [insights, setInsights] = useState<any[]>([]);
  const [trends, setTrends] = useState<any>({});
  
  const artifact = workflowState?.learning_artifact;

  useEffect(() => {
    // In a real app we would fetch from `/api/v1/learning/insights`
    // Here we use the payload from the state
    if (artifact && artifact.payload) {
      setInsights(artifact.payload.organizational_insights || []);
      setTrends(artifact.payload.performance_trends || {});
    }
  }, [artifact]);

  if (!artifact || !artifact.payload) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center p-12">
        <div className="text-center">
          <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Learning Engine Offline</h3>
          <p className="text-gray-500 mt-2">Waiting for approval completion to generate organizational memory.</p>
        </div>
      </div>
    );
  }

  const payload = artifact.payload;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Organizational Learning Engine</h2>
            <p className="text-xs text-gray-500">Continuous Memory & Optimization</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Learning Active
          </span>
        </div>
      </div>
      
      <div className="p-6 overflow-y-auto flex-1">
        <div className="mb-6 bg-indigo-50 rounded-lg p-4 border border-indigo-100">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2">Learning Summary</h3>
          <p className="text-sm text-indigo-800">{payload.learning_summary}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Organizational Insights</h3>
            </div>
            <ul className="space-y-3">
              {payload.organizational_insights?.map((insight, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-gray-700">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">Strategy Success Patterns</h3>
            </div>
            <ul className="space-y-3">
              {payload.strategy_success_patterns?.map((pattern, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-gray-700">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Accepted Patterns
            </h3>
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
              <ul className="space-y-2">
                {payload.accepted_patterns?.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-600">{item}</li>
                ))}
              </ul>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Rejected Patterns
            </h3>
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
              <ul className="space-y-2">
                {payload.rejected_patterns?.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-600">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-purple-500" />
            Optimization Recommendations
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <h4 className="text-sm font-medium text-purple-900 mb-2">Prompt Updates</h4>
              <ul className="space-y-2">
                {payload.prompt_improvement_suggestions?.map((item, idx) => (
                  <li key={idx} className="text-xs text-purple-800">{item}</li>
                ))}
              </ul>
            </div>
            
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <h4 className="text-sm font-medium text-indigo-900 mb-2">Knowledge Gaps</h4>
              <ul className="space-y-2">
                {payload.knowledge_gaps?.map((item, idx) => (
                  <li key={idx} className="text-xs text-indigo-800">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
