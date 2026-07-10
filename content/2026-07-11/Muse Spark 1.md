---
title: "【Muse Spark 1...."
date: 2026-07-11
tags: ["软件与互联网"]
---

> 来源：知识星球「调研纪要」

## 原文内容
🔥【Muse Spark 1.1】Meta杀入Agent编码战场：工具调用能力突出，定价再创新低 | 

[太阳]事件：2026年7月9日，Meta发布Muse Spark 1.1，系Meta Superintelligence Labs（MSL）旗下Muse Spark系列的第二个版本（v1于2026年4月发布）。定位为多模态Agent编码模型，面向多步推理、复杂工作流管理、企业系统自动化部署等场景。扎克伯格三年来首次在X发帖为其站台，称其为"以极低价格提供的强大Agent编码模型"，并强调"在Ag
ent性能、工具调用和计算机使用方面最强"，暗示后续还有更多模型即将推出。

[太阳]核心能力：工具调用成功率领先，Agent任务表现突出
- Muse Spark 1.1采用JEPA架构（LeCun路线），具备多模态能力。官方表示该模型在编码和多模态任务上表现良好，在工具调用成功率上表现尤为突出——这一点在社区评测中得到验证；

- 模型支持多步推理，能够管理复杂数字工作流、修复Bug、处理大规模代码迁移，面向企业级自动化场景；

- 独立测试机构RuntimeWire的实时对比中，Muse Spark 1.1以104.5:94.5击败Anthropic Opus 4.8（95%置信度，7:2任务胜出）。Muse在指令遵循、格式约束、SQL/JSON结构化输出等可靠性维度上明显领先；

- Terminal Bench 2.1方面，Meta自评使用了89个任务进行评测，但社区指出Meta将资源上限提升至6核CPU/8GB RAM，超出Terminal Bench 2.1标准限制（最高4核，仅8/89个任务允许8GB RAM），benchmark结果存在争议。DeepSWE评测中表现也被认为不够突出。

[太阳]定价对标海外全行业最低，缓存命中价格更低
- Muse Spark 1.1 API定价为每百万Token输入$1.25/输出$4.25，缓存命中仅$0.15/百万Token；

- 对比：Grok 4.5（$2/$6，缓存$0.50）、Opus 4.8（$5/$25，缓存$0.50）、Fable 5（$10/$50）、GPT-5.6 Luna（$1/$6）；

- 缓存命中价格$0.15仅为Grok 4.5（$0.50）的30%，在多轮编码场景下实际成本优势显著；社区评价："Opus级智能、Haiku级价格"。

[太阳]产品生态：Meta AI平台工具矩阵完整
- Muse Spark 1.1在meta.ai上已接入16个工具，包括：网页搜索与浏览、Instagram/Threads/Facebook内容语义搜索、商品目录搜索、AI图像生成、Python代码解释器（内置pandas/numpy/matplotlib/sklearn等）等；

- 模型提供三种推理模式：Instant（即时）、Thinking（思考）及规划中的Contemplating（深度沉思，对标Gemini Deep Think/GPT-5.4 Pro）；

- 本周Meta同步发布AI图像生成模型Muse Image，AI产品矩阵持续扩展。

## 投资逻辑
（待分析）

## 风险提示
暂无
