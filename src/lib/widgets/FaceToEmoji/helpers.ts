import { writable } from 'svelte/store';

//type:
import { LikelihoodValueEnum } from './types';
import type { Likelihood, RequestBodyVision, CleanedAnnotation, FaceAnnotation } from './types';

//stores
export const faceFocused = writable(null as number);

// transform file to Bytes or Base64
export const toBase64 = (file): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			if (typeof reader.result == 'string')
				resolve(reader.result.replace('data:', '').replace(/^.+,/, ''));
		};
		reader.onerror = (error) => reject(error);
	});
};

// API call
export async function getResponseFromGoogleVision(file: File | Blob): Promise<Response> {
	const requestBody: RequestBodyVision = {
		requests: [
			{
				image: { content: await toBase64(file) },
				features: [{ maxResults: 20, type: 'FACE_DETECTION' }]
			}
		]
	};

	return fetch(`/api/visions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json; charset=utf-8'
		},
		body: JSON.stringify(requestBody)
	});
}

// clean data
export function extractAndCleanFacesAnnotations(
	annotations: FaceAnnotation[]
): Array<CleanedAnnotation> {
	return annotations.map(
		({ angerLikelihood, joyLikelihood, sorrowLikelihood, surpriseLikelihood, fdBoundingPoly }) => {
			const likelihoodsData: Likelihood[] = [
				{ angerLikelihood },
				{ joyLikelihood },
				{ sorrowLikelihood },
				{ surpriseLikelihood }
			];

			const likelihoods = likelihoodsData
				.map((a) => {
					return { label: Object.keys(a)[0], value: Object.values(a)[0] };
				})
				.sort((a, b) => (LikelihoodValueEnum[a.value] > LikelihoodValueEnum[b.value] ? -1 : 1));

			return {
				positions: fdBoundingPoly.vertices,
				likelihoods
			};
		}
	);
}

export function findTheEmoji(
	likelihoods: Array<{ label: string; value: keyof LikelihoodValueEnum }>
): string {
	if (likelihoods.every((a) => a.value === LikelihoodValueEnum[0])) return '😶';

	switch (likelihoods[0].label) {
		case 'joyLikelihood':
			switch (likelihoods[0].value) {
				case LikelihoodValueEnum[5]:
					return '😆';
				case LikelihoodValueEnum[4]:
					return '😃';
				case LikelihoodValueEnum[3]:
					return '🙂';
				case LikelihoodValueEnum[2]:
				case LikelihoodValueEnum[1]:
					return '😐';
				default:
					return '😶';
			}
		case 'sorrowLikelihood':
			switch (likelihoods[0].value) {
				case LikelihoodValueEnum[5]:
					return '😭';
				case LikelihoodValueEnum[4]:
					return '😢';
				default:
					return '😟';
			}
		case 'angerLikelihood':
			switch (likelihoods[0].value) {
				case LikelihoodValueEnum[5]:
					return '😡';
				case LikelihoodValueEnum[4]:
					return '😠';
				default:
					return '😤';
			}
		case 'surpriseLikelihood':
			switch (likelihoods[0].value) {
				case LikelihoodValueEnum[5]:
					return '😲';
				case LikelihoodValueEnum[4]:
					return '😮';
				default:
					return '😯';
			}
	}
}
