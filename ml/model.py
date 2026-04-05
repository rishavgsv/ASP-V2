import torch
import torch.nn as nn
from transformers import Wav2Vec2Model, Wav2Vec2Config

class AAQAModel(nn.Module):
    def __init__(self, model_checkpoint="facebook/wav2vec2-base-960h", num_classes=3):
        super(AAQAModel, self).__init__()
        self.config = Wav2Vec2Config.from_pretrained(model_checkpoint)
        self.wav2vec2 = Wav2Vec2Model.from_pretrained(model_checkpoint)
        
        # Freeze feature extractor for faster training/inference
        for param in self.wav2vec2.feature_extractor.parameters():
            param.requires_grad = False
            
        self.pooling = nn.AdaptiveAvgPool1d(1)
        
        # Task 1: Quality Score (0-100)
        self.score_head = nn.Sequential(
            nn.Linear(self.config.hidden_size, 256),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(256, 1),
            nn.Sigmoid() # Normalize to 0-1 initially, scale later
        )
        
        # Task 2: Classification (Good, Moderate, Poor)
        self.classifier_head = nn.Sequential(
            nn.Linear(self.config.hidden_size, 256),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(256, num_classes)
        )
        
        # Task 3: Clarity Score (0-1)
        self.clarity_head = nn.Sequential(
            nn.Linear(self.config.hidden_size, 256),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )

    def forward(self, input_values):
        # Pass through Wav2Vec2
        outputs = self.wav2vec2(input_values)
        hidden_states = outputs.last_hidden_state # [Batch, Seq_len, Hidden_size]
        
        # Pool across sequence dimension
        pooled = self.pooling(hidden_states.transpose(1, 2)).squeeze(2) # [Batch, Hidden_size]
        
        score = self.score_head(pooled) * 100
        classification = self.classifier_head(pooled)
        clarity = self.clarity_head(pooled)
        
        return {
            "score": score,
            "classification": classification,
            "clarity": clarity
        }

if __name__ == "__main__":
    # Test initialization
    pass
