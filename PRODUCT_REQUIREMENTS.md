# SHAASTRA Product Requirements

## Product purpose

SHAASTRA is a real-time disaster management platform for floods, earthquakes, cyclones, landslides, and similar events. It brings citizens, shelter administrators, and district authorities into one operational system so people can find safe shelter, families can reconnect, and relief teams can act on current capacity and resource information.

This document uses the team's Smart India Hackathon 2026 proposal for problem statement SIH1468 as its primary source.

## Problem

During a disaster, affected citizens do not know which shelters have safe space or essential supplies. Families have no trusted, shared way to confirm whether a loved one is safe. Shelter staff commonly report on paper or through fragmented channels, leaving authorities without an accurate district-wide picture. Weak connectivity makes these gaps worse.

## Target users

- Citizens and disaster-affected families seeking safe shelter or information.
- Family members trying to find or contact a missing loved one.
- Shelter administrators updating occupancy and resource status.
- District coordinators and authorised disaster-response authorities monitoring and allocating support.

## Citizen features

- Clear, mobile-first access to the current disaster response status.
- Find nearby verified shelters and view current availability.
- See whether a shelter has beds, food, and medicine.
- Mark themselves safe and search the verified safe registry.
- Submit a structured disaster report when safe to do so.
- Ask the Emergency Assistant for grounded, non-medical operational guidance.

## Shelter management

Shelter administrators must be able to create and update their assigned shelter record, including total capacity, occupied beds, available beds, food stock, medicine stock, operating status, and last-updated time. The system must flag near-capacity shelters and critical resource shortages for authority review.

## Shelter discovery

Citizens must be able to discover verified shelters by list and map. Results must show name, locality, distance when location is available, operating status, available beds, food and medicine availability, and update freshness. The MVP must remain useful as a simple list when mapping or precise location is unavailable.

## Family reconnection

### I'm Safe

A person can register their name, contact number, current shelter or general location, and an optional short message. The record is private by default and becomes searchable only through controlled, verified matching.

### Looking For

A family member can search using the person's name and optional identifying details. The result must disclose only safe, minimal information: verification status, recorded shelter/location, and an optional safe-message. Direct contact details must not be publicly displayed. Potential future image matching is out of MVP scope and requires human verification.

## Authority dashboard

Authorised officials need a district-level live view of active shelters, total capacity, occupancy, available beds, safe registrations, resource condition, alerts, and recent activity. They must be able to filter by zone and identify facilities requiring prioritised relief allocation.

## Disaster reporting

Citizens and authorised staff can submit location-aware reports about hazards, blocked routes, urgent resource needs, and shelter conditions. Reports require a status lifecycle: received, reviewed, verified, actioned, or closed. Public display and operational decisions must be based on authority verification, not unreviewed public reports.

## AI Emergency Assistant

The assistant provides concise, disaster-relevant guidance using approved response content and current SHAASTRA data. It may explain available shelter options, safety checklists, and how to submit a report. It must clearly state uncertainty, never invent shelter capacity or official instructions, and escalate emergency situations to official emergency channels.

## AI Resource Prediction

The system should estimate likely food, medicine, and bed shortages from time-stamped occupancy and inventory trends. Predictions are advisory alerts for coordinators, not autonomous allocation decisions. The MVP may use transparent threshold rules before introducing a predictive model.

## Low-bandwidth and offline strategy

- Keep critical screens small, text-first, and usable on 2G/poor connections.
- Make map use optional and provide list-based shelter discovery.
- Cache the most recent verified shelter and emergency information for offline viewing.
- Queue non-urgent form submissions locally and sync when connectivity returns.
- Design a future SMS interface for basic shelter lookup and safe-status updates.
- Avoid essential information hidden behind images, animations, or large downloads.

## MVP priorities

1. A dependable working citizen, shelter, and authority flow.
2. Clear, accessible, mobile-first user experience.
3. Live-looking, explainable data updates and alerts.
4. Safe family-reconnection workflow with privacy controls.
5. A lightweight AI assistant and threshold-based resource warnings.
6. Simple deployment and demo readiness.

## Seven-day scope

Days 1-2: agree the data model, roles, key screens, and static prototype flows.

Days 3-4: connect shelter records, safe registry, authority dashboard, and role-based authentication to a managed backend.

Day 5: add realtime updates, alert rules, report review flow, and baseline AI assistant grounding.

Day 6: add low-bandwidth fallbacks, test core journeys, seed credible demo data, and harden privacy controls.

Day 7: polish the demo, deploy, rehearse failure fallbacks, and prepare the architecture/story presentation.

## Definition of done

The MVP is done when a demo user can find a verified shelter and see availability; a person can create a safe-status record and an authorised lookup can find it; a shelter administrator can update occupancy/resources; an authority user sees the change and receives a shortage/capacity alert; the system handles an offline/poor-network fallback gracefully; and all role-sensitive actions, data handling, and AI responses follow the rules in `RULES.md`.
