<?php
function comparePlaylists($a, $b) {
	if ($a['hour'] === $b['hour']) return 0;
	return ($a['hour'] < $b['hour']) ? -1 :  1;
}

class Playlist {

	public $list;
	public $audio_dir;

	public function Playlist($options = array()) {
		$defaults = array(
			'audio_dir' => __DIR__
		);
		foreach ($defaults as $key => $value) {
			$this->$key = (isset($options[$key])) ? $options[$key] : $value;
		}
		$this->buildPlaylist();
	}

	private function buildPlaylist() {
		$this->list = array();
		$all_handle = opendir($this->audio_dir);
		while ($mood = readdir($all_handle)) {
			if ($mood == '.' || $mood == '..') continue;
			$mood_handle = opendir($this->audio_dir . '/' . $mood);
			$this->list[$mood] = array();
			while ($hour = readdir($mood_handle)) {
				$playlist = array(
					'hour' => $hour,
					'list' => array()
				);
				if ($hour == '.' || $hour == '..') continue;
				$hour_handle = opendir($this->audio_dir . '/' . $mood . '/' . $hour);
				while ($file = readdir($hour_handle)) {
					if ($file == '.' || $file == '..') continue;
					$playlist['list'][] = $file;
				}
				closedir($hour_handle);
				sort($playlist['list']);
				$this->list[$mood][] = $playlist;
			}
			closedir($mood_handle);
			usort($this->list[$mood], 'comparePlaylists');
		}
		closedir($all_handle);
	}

}
